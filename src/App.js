import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, Eye, Edit2, Calculator } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import './App.css';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const BillGenerator = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const fileInputRef = useRef(null);

  // Function to convert number to words in Indian format
  const numberToWords = (amount) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const convertHundreds = (num) => {
      let words = '';
      if (typeof num !== 'number' || isNaN(num) || num < 0) return ''; 
      num = Math.floor(num); 

      if (num >= 100) {
        words += ones[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
      }
      if (num >= 20) {
        words += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      } else if (num >= 10) {
        words += teens[num - 10] + ' ';
        num = 0; 
      }
      if (num > 0) { 
        words += ones[num] + ' ';
      }
      return words; 
    };

    if (amount === 0) return 'Zero Rupees Only';
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) return ''; 
    
    const [rupeesStr, paiseStr] = amount.toFixed(2).split('.');
    let rupees = parseInt(rupeesStr, 10); 
    let paise = parseInt(paiseStr, 10); 

    let resultWords = []; 

    let crores = Math.floor(rupees / 10000000);
    rupees %= 10000000;
    if (crores > 0) {
      resultWords.push(convertHundreds(crores).trim() + ' Crore');
    }

    let lakhs = Math.floor(rupees / 100000);
    rupees %= 100000;
    if (lakhs > 0) {
      resultWords.push(convertHundreds(lakhs).trim() + ' Lakh');
    }

    let thousands = Math.floor(rupees / 1000);
    rupees %= 1000;
    if (thousands > 0) {
      resultWords.push(convertHundreds(thousands).trim() + ' Thousand');
    }

    let hundreds = rupees;
    if (hundreds > 0) {
      resultWords.push(convertHundreds(hundreds).trim());
    }
    
    let finalRupeesPart = resultWords.join(' ').trim();
    if (finalRupeesPart) {
        finalRupeesPart += ' Rupees';
    }

    let paiseWords = '';
    if (paise > 0) {
      let tempPaise = paise;
      if (tempPaise >= 20) {
        paiseWords += tens[Math.floor(tempPaise / 10)] + ' ';
        tempPaise %= 10;
      } else if (tempPaise >= 10) {
        paiseWords += teens[tempPaise - 10] + ' ';
        tempPaise = 0;
      }
      if (tempPaise > 0) { 
        paiseWords += ones[tempPaise] + ' ';
      }
      paiseWords = paiseWords.trim() + ' Paise';
    }

    let finalAmountInWords = '';
    if (finalRupeesPart && paiseWords) {
      finalAmountInWords = finalRupeesPart + ' And ' + paiseWords;
    } else if (finalRupeesPart) {
      finalAmountInWords = finalRupeesPart + ' Only';
    } else if (paiseWords) {
      finalAmountInWords = paiseWords; 
    } else { 
      finalAmountInWords = 'Zero Rupees Only'; 
    }

    return finalAmountInWords.trim();
  };

  // Helper to format numbers with commas
  function formatAmount(num) {
    if (typeof num !== 'number' || isNaN(num)) return '';
    return num.toLocaleString('en-IN');
  }

  // Helper to format numbers as Indian currency
  function formatINRCurrency(num) {
    if (typeof num !== 'number' || isNaN(num)) return '';
    return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const extractDataFromPDF = async (file) => {
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(' ') + ' ';
      }

      const isIDFCBankDoc = fullText.includes('IDFC FIRST Bank');

      let customerNameMatch;
      let manufacturerMatch;
      let modelMatch;
      let assetCostMatch;
      let assetCost = 0;

      let finalCustomerName = '';

      // Customer Name
      if (isIDFCBankDoc) {
        // For IDFC, extract name between "loan application of" and "has been approved for"
        customerNameMatch = fullText.match(/loan application of (.+?) has been approved for/i);
        finalCustomerName = customerNameMatch ? `${customerNameMatch[1].trim()} [IDFC FIRST BANK]` : '';
      } else {
        customerNameMatch = fullText.match(/Customer Name:?[ \t]*([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/i);
        finalCustomerName = customerNameMatch ? customerNameMatch[1].trim() : '';
      }

      // Manufacturer
      if (isIDFCBankDoc) {
        manufacturerMatch = null;
      } else {
        manufacturerMatch = fullText.match(/Manufacturer:?[ \t]*([^ \t\n]+)/i);
      }
      let manufacturer = manufacturerMatch ? manufacturerMatch[1].trim() : '';

      // Customer Address: Capture content strictly after the label, up to and including the pincode, then clean up any remaining label
      const addressMatch = fullText.match(/(?:Customer )?Address:?[ \t]*([\s\S]*?\d{6})/i);
      let customerAddress = addressMatch ? addressMatch[1].trim() : '';
      // Re-adding robust post-processing to ensure no label remains in the address string
      customerAddress = customerAddress.replace(/^(?:Customer )?Address:?[ \t]*(.*)$/i, '$1').trim();

      // Asset Category
      const rawAssetCategoryMatch = fullText.match(/Asset Category:?[ \t]*([A-Za-z\s]+?)(?=\s*(?:Sub-Category|Variant|\bModel\b|\bSerial Number\b|\bAsset Cost\b|$))/i);
      let assetCategory = rawAssetCategoryMatch ? rawAssetCategoryMatch[1].trim() : '';
      if (assetCategory.endsWith('D')) {
        assetCategory = assetCategory.slice(0, -1).trim();
      }

      // Model
      if (isIDFCBankDoc) {
        // Model will be the Model No in the pdf that I have uploaded
        modelMatch = fullText.match(/Model Number:?[ \t]*([^\n\r]+?)(?!E\s*(?:Scheme Name|Serial Number|Asset Category|\n|\r))(?=\s*(?:Scheme Name|Serial Number|Asset Category|\n|\r))/i);
      } else {
        modelMatch = fullText.match(/Model:?\s*([^\n\r]+?)(?=\s*Asset Category|\n|\r)/i);
      }
      let model = modelMatch ? modelMatch[1].trim() : '';
      if (isIDFCBankDoc && model.endsWith('E')) {
        model = model.slice(0, -1).trim();
      }

      // Serial Number
      const serialNumberMatch = fullText.match(/Serial Number:?[ \t]*([^ \t\n]+)/i);

      // Asset Cost
      if (isIDFCBankDoc) {
        // The Asset cost here will be Cost Of Product
        assetCostMatch = fullText.match(/Cost Of Product[\s:]*([\d,\.]+)/i);
      } else {
        assetCostMatch = fullText.match(/A\. Asset Cost[^\d]*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i);
      }
      if (assetCostMatch) {
        // Remove all non-numeric characters except the decimal point before parsing
        assetCost = parseFloat(assetCostMatch[1].replace(/[^0-9.]/g, ''));
      }

      const extractedData = {
        customerName: finalCustomerName,
        customerAddress: customerAddress,
        manufacturer: manufacturer,
        assetCategory: assetCategory,
        model: model,
        imeiSerialNumber: serialNumberMatch ? serialNumberMatch[1].trim() : '',
        date: new Date().toISOString().split('T')[0],
        assetCost: assetCost
      };

      setExtractedData(extractedData);
    } catch (error) {
      console.error('Error extracting PDF data:', error);
      alert('Error extracting data from PDF. Please make sure the PDF is properly formatted.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
      extractDataFromPDF(file);
    } else {
      alert('Please upload a PDF file');
    }
  };

  const calculateTaxDetails = (assetCost, assetCategory) => {
    const isAirConditioner = assetCategory.toUpperCase().includes('AIR CONDITIONER');
    const rate = isAirConditioner ? assetCost / 1.28 : assetCost / 1.18;
    const cgst = isAirConditioner ? ((assetCost - (assetCost / 1.28)) / 2) : ((assetCost - (assetCost / 1.18)) / 2);
    const sgst = cgst;
    const taxableValue = assetCost - (sgst + cgst);
    const taxRate = isAirConditioner ? 14 : 9;
    const totalTaxAmount = sgst + cgst;
    
    return {
      rate: rate.toFixed(2),
      cgst: cgst.toFixed(2),
      sgst: sgst.toFixed(2),
      taxableValue: taxableValue.toFixed(2),
      taxRate,
      totalTaxAmount: totalTaxAmount.toFixed(2)
    };
  };

  const generateBillHTML = () => {
    if (!extractedData || !invoiceNumber) return '';
    const taxDetails = calculateTaxDetails(extractedData.assetCost, extractedData.assetCategory);
    const amountInWords = numberToWords(extractedData.assetCost);
    const taxAmountInWords = numberToWords(parseFloat(taxDetails.totalTaxAmount));

    console.log('totalTaxAmount before numberToWords:', taxDetails.totalTaxAmount);

    return `
    <div style="width: 100%; max-width: 210mm; min-height: 297mm; margin: 0 auto; font-family: Arial, sans-serif; font-size: 9px; line-height: 1.2; box-sizing: border-box; padding: 5mm;">
      <div style="text-align:center; font-size:18px; font-weight:bold; margin-bottom:8px;">Tax Invoice</div>
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 0; table-layout: fixed;">
        <tr>
          <td rowspan="8" style="border:1px solid #000; padding:8px; width:40%; vertical-align:top; font-weight:bold; font-size:8px;">
            KATIYAR ELECTRONICS<br>
            H.I.G.J-33 VISHWABANK BARRA<br>
            KARRAHI<br>
            KANPUR NAGAR<br>
            GSTIN/UIN: 09AMTPK9751D1ZH<br>
            State Name: Uttar Pradesh, Code: 09<br>
            E-Mail: katiyars952@gmail.com<br>
            <div style="margin-left: -8px; margin-right: -8px;">
              <hr style="border: none; border-top: 1px solid #000; width: 100%; margin: 0; padding: 0;" />
            </div>
            <b>Consignee (Ship to)</b><br>
            ${extractedData.customerName}<br>
            ${extractedData.customerAddress}<br>
            <div style="margin-left: -8px; margin-right: -8px;">
              <hr style="border: none; border-top: 1px solid #000; width: 100%; margin: 0; padding: 0;" />
            </div>
            <b>Buyer (Bill to)</b><br>
            ${extractedData.customerName}<br>
            ${extractedData.customerAddress}
          </td>
          <td style="border:1px solid #000; padding:8px; font-weight:bold; width:50%; font-size:8px; text-align:center;">Invoice No.<div style='height:5px;'></div><div>${invoiceNumber}</div></td>
          <td style="border:1px solid #000; padding:8px; font-weight:bold; width:50%; font-size:8px; text-align:center;">Dated<div style='height:5px;'></div><div>${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div></td>
        </tr>
        <tr>
          <td style="border:1px solid #000; padding:8px; font-weight:bold; font-size:8px; text-align:center; width:50%;">Delivery Note<div style='height:5px;'></div></td>
          <td style="border:1px solid #000; padding:8px; font-weight:bold; font-size:8px; text-align:center; width:50%;"></td>
        </tr>
        <tr>
          <td style="border:1px solid #000; padding:8px; font-weight:bold; font-size:8px; text-align:center; width:50%;">Buyer's Order No.<div style='height:5px;'></div></td>
          <td style="border:1px solid #000; padding:8px; font-weight:bold; font-size:8px; text-align:center; width:50%;">Dated<div style='height:5px;'></div></td>
        </tr>
        <tr>
          <td style="border:1px solid #000; padding:8px; font-weight:bold; font-size:8px; text-align:center; width:50%;">Dispatch Doc No.<div style='height:5px;'></div></td>
          <td style="border:1px solid #000; padding:8px; font-weight:bold; font-size:8px; text-align:center; width:50%;">Delivery Note Date<div style='height:5px;'></div></td>
        </tr>
        <tr>
          <td style="border:1px solid #000; padding:8px; font-weight:bold; font-size:8px; text-align:center; width:50%;">Dispatched through<div style='height:5px;'></div></td>
          <td style="border:1px solid #000; padding:8px; font-weight:bold; font-size:8px; text-align:center; width:50%;">Destination<div style='height:5px;'></div></td>
        </tr>
        <tr>
          <td colspan="2" style="border:1px solid #000; padding:8px; font-size:8px;"></td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-top:0; margin-bottom: 0;">
        <tr style="background-color: #f0f0f0;">
          <td style="border: 1px solid #000; text-align: center; width: 4%; padding: 2px; font-size:8px;"><strong>Sl</strong></td>
          <td style="border: 1px solid #000; text-align: center; width: 40%; padding: 2px; font-size:8px;"><strong>Description of Goods</strong></td>
          <td style="border: 1px solid #000; text-align: center; width: 12%; padding: 2px; font-size:8px;"><strong>HSN/SAC</strong></td>
          <td style="border: 1px solid #000; text-align: center; width: 8%; padding: 2px; font-size:8px;"><strong>Quantity</strong></td>
          <td style="border: 1px solid #000; text-align: center; width: 12%; padding: 2px; font-size:8px;"><strong>Rate</strong></td>
          <td style="border: 1px solid #000; text-align: center; width: 4%; padding: 2px; font-size:8px;"><strong>per</strong></td>
          <td style="border: 1px solid #000; text-align: center; width: 20%; padding: 2px; font-size:8px;"><strong>Amount</strong></td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;">1</td>
          <td style="border: 1px solid #000; vertical-align: top; padding: 4px; font-size:8px;">
            <strong>${extractedData.manufacturer} ${extractedData.assetCategory}</strong><br><br>
            <strong>Model No:</strong> ${extractedData.model}<br>
            ${extractedData.imeiSerialNumber ? `<strong>Serial No:</strong> ${extractedData.imeiSerialNumber}<br>` : ''}<br>
            <div style="display: flex; justify-content: space-between; margin-top: 4px;">
              <div><strong>CGST</strong></div>
              <div>${formatAmount(Number(taxDetails.cgst))}</div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0;">
              <div><strong>SGST</strong></div>
              <div>${formatAmount(Number(taxDetails.sgst))}</div>
            </div>
            <div style="height: 350px;"></div>
          </td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;">1 PCS</td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;">${formatAmount(Number(taxDetails.rate))}</td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;">PCS</td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;">${formatAmount(Number(taxDetails.rate))}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; text-align: right; padding: 2px; font-size:8px;" colspan="6"><strong>Total</strong></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"><strong>₹ ${formatAmount(Number(extractedData.assetCost))}</strong></td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; border-left: 1.5px solid #000; border-right: 1.5px solid #000; margin: 0;">
        <tr>
          <td style="border-left: 1px solid #000; border-right: none; border-top: none; border-bottom: none; width: 1%;"></td>
          <td style="border: none; font-size:8px; padding: 4px;">
            <strong>Amount Chargeable (in words)</strong><br>
            <strong>INR ${amountInWords}</strong>
          </td>
          <td style="border-right: 1px solid #000; border-left: none; border-top: none; border-bottom: none; width: 1%;"></td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 4px;">
        <tr style="background-color: #f0f0f0;">
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;" rowspan="2"><strong>HSN/SAC</strong></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;" rowspan="2"><strong>Taxable Value</strong></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;" colspan="2"><strong>Central Tax</strong></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;" colspan="2"><strong>State Tax</strong></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;" rowspan="2"><strong>Total Tax Amount</strong></td>
        </tr>
        <tr style="background-color: #f0f0f0;">
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"><strong>Rate</strong></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"><strong>Amount</strong></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"><strong>Rate</strong></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"><strong>Amount</strong></td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;">${formatAmount(Number(taxDetails.taxableValue))}</td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;">${taxDetails.taxRate}%</td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;">${formatAmount(Number(taxDetails.cgst))}</td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;">${taxDetails.taxRate}%</td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;">${formatAmount(Number(taxDetails.sgst))}</td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;">${formatAmount(Number(taxDetails.totalTaxAmount))}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"><strong>Total</strong></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"><strong>${formatAmount(Number(taxDetails.taxableValue))}</strong></td>
          <td style="border: 1px solid #000; padding: 2px; font-size:8px;"></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"><strong>${formatAmount(Number(taxDetails.cgst))}</strong></td>
          <td style="border: 1px solid #000; padding: 2px; font-size:8px;"></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"><strong>${formatAmount(Number(taxDetails.sgst))}</strong></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"><strong>${formatAmount(Number(taxDetails.totalTaxAmount))}</strong></td>
        </tr>
        <tr>
          <td colspan="7" style="border-left: 1.5px solid #000; border-right: 1.5px solid #000; border-top: none; border-bottom: none; font-size:8px; padding: 4px 0; text-align:center;">
            <strong>Tax Amount (in words): INR ${taxAmountInWords}</strong>
          </td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 4px;">
        <tr>
          <td style="border: 1px solid #000; width: 50%; vertical-align: top; padding: 4px; font-size:8px;">
            <strong>Declaration</strong><br>
            We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
          </td>
          <td style="border: 1px solid #000; width: 25%; vertical-align: top; padding: 4px; font-size:8px;">
            <strong>Pre Authenticated by</strong><br><br>
            Authorised Signatory<br>
            Name:<br>
            Designation:
          </td>
          <td style="border: 1px solid #000; width: 25%; vertical-align: top; text-align: center; padding: 4px; font-size:8px;">
            <strong>for KATIYAR ELECTRONICS</strong><br><br>
            Authorised Signatory<br>
            Name:<br>
            Designation:
          </td>
        </tr>
      </table>
      <div style="text-align: center; font-size: 8px; margin-top: 4px;">
        <strong>SUBJECT TO KANPUR JURISDICTION</strong><br>
        This is a Computer Generated Invoice
      </div>
    </div>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Tax Invoice</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              @page { 
                size: A4; 
                margin: 10mm; 
              }
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }
          </style>
        </head>
        <body>
          ${generateBillHTML()}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div>
      <div className="bill-container">
        <h1 className="bill-header">Professional Bill Generator</h1>

        {/* Upload Section */}
        <div className="upload-section">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf"
            className="hidden"
          />
          <Upload style={{ width: 56, height: 56, color: '#60a5fa', marginBottom: 16 }} />
          <p style={{ color: '#2563eb', marginBottom: 16, fontSize: '1.1rem', fontWeight: 500 }}>
            Upload PDF to extract bill information
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="upload-btn"
          >
            <FileText style={{ width: 20, height: 20 }} />
            Choose PDF File
          </button>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="processing">
            <span>Processing PDF...</span>
          </div>
        )}

        {/* Extracted Data Display */}
        {extractedData && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 16, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calculator style={{ width: 24, height: 24 }} />
              Extracted Information
            </h2>
            <div className="info-card">
              <div><strong>Customer Name:</strong> {extractedData.customerName}</div>
              <div><strong>Manufacturer:</strong> {extractedData.manufacturer}</div>
              <div className="full"><strong>Customer Address:</strong> {extractedData.customerAddress}</div>
              <div><strong>Asset Category:</strong> {extractedData.assetCategory}</div>
              <div><strong>Model:</strong> {extractedData.model}</div>
              <div><strong>Serial Number:</strong> {extractedData.imeiSerialNumber}</div>
              <div><strong>Asset Cost:</strong> ₹{extractedData.assetCost.toFixed(2)}</div>
            </div>

            {/* Invoice Number Input */}
            <div style={{ marginTop: 32 }}>
              <label className="input-label">Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Enter invoice number"
                className="input-box"
              />
            </div>

            {/* Action Buttons */}
            <div className="action-btns">
              <button
                onClick={() => setShowBillPreview(true)}
                disabled={!invoiceNumber.trim()}
                className="action-btn"
              >
                <Eye style={{ width: 20, height: 20 }} />
                Preview Bill
              </button>
              <button
                onClick={handlePrint}
                disabled={!invoiceNumber.trim()}
                className="action-btn print"
              >
                <Download style={{ width: 20, height: 20 }} />
                Print/Download
              </button>
            </div>
          </div>
        )}

        {/* Bill Preview */}
        {showBillPreview && extractedData && invoiceNumber && (
          <div className="modal-overlay">
            <div className="modal-content">
              <button
                onClick={() => setShowBillPreview(false)}
                className="modal-close"
                aria-label="Close preview"
              >
                ×
              </button>
              <div
                style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, overflow: 'auto', maxHeight: '70vh' }}
                dangerouslySetInnerHTML={{ __html: generateBillHTML() }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillGenerator;