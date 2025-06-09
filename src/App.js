import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, Eye, Edit2, Calculator } from 'lucide-react';

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
      let result = '';
      if (num >= 100) {
        result += ones[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
      }
      if (num >= 20) {
        result += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      } else if (num >= 10) {
        result += teens[num - 10] + ' ';
        return result;
      }
      if (num > 0) {
        result += ones[num] + ' ';
      }
      return result;
    };

    if (amount === 0) return 'Zero Rupees Only';
    
    let crores = Math.floor(amount / 10000000);
    amount %= 10000000;
    let lakhs = Math.floor(amount / 100000);
    amount %= 100000;
    let thousands = Math.floor(amount / 1000);
    amount %= 1000;
    let hundreds = amount;

    let result = '';
    if (crores > 0) result += convertHundreds(crores) + 'Crore ';
    if (lakhs > 0) result += convertHundreds(lakhs) + 'Lakh ';
    if (thousands > 0) result += convertHundreds(thousands) + 'Thousand ';
    if (hundreds > 0) result += convertHundreds(hundreds);

    return result.trim() + ' Rupees Only';
  };

  // Mock PDF extraction function
  const extractDataFromPDF = async (file) => {
    setIsProcessing(true);
    
    // Simulate PDF processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock extracted data based on the reference images
    const mockData = {
      customerName: "AVADHESH KUMAR GUPTA",
      customerAddress: "11A KHADEPUR NEW BASTI YOGENDRA BIHAR-2 POST-NAUBASTA KANPUR KANPUR NAGAR UTTAR PRADESH 208021 INDIA KANPUR NAGAR UTTAR PRADESH NEAR SHRI RAM PLACE 208021",
      manufacturer: "WHIRLPOOL",
      assetCategory: "AIR CONDITIONER",
      model: "3DCOOL PRO 1ST 3S INV EXP SSM2PB1-42466",
      imeiSerialNumber: "42466FT251105119",
      date: new Date().toISOString().split('T')[0],
      assetCost: 21000.00
    };
    
    setExtractedData(mockData);
    setIsProcessing(false);
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
    const currentDate = new Date().toLocaleDateString('en-GB');
    
    return `
      <div style="width: 210mm; min-height: 297mm; margin: 0 auto; padding: 10mm; font-family: Arial, sans-serif; font-size: 10px; line-height: 1.2; box-sizing: border-box;">
        <div style="text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 20px;">
          Tax Invoice
        </div>
        
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; margin-bottom: 10px;">
          <tr>
            <td style="border: 1px solid black; padding: 5px; width: 50%; vertical-align: top;">
              <strong>KATIYAR ELECTRONICS</strong><br>
              H.I.G J-33 VISHWABANKBARRA<br>
              KARRAHI<br>
              KANPUR NAGAR<br>
              GSTIN/UIN: 09AMTFK9751D1ZH<br>
              State Name : Uttar Pradesh, Code : 09<br>
              E-Mail : katiyar552@gmail.com
            </td>
            <td style="border: 1px solid black; padding: 5px; width: 25%; vertical-align: top;">
              <div style="margin-bottom: 10px;">
                <strong>Invoice No.</strong><br>
                ${invoiceNumber}
              </div>
              <div style="margin-bottom: 10px;">
                <strong>Delivery Note</strong><br>
              </div>
              <div style="margin-bottom: 10px;">
                <strong>Buyer's Order No.</strong><br>
              </div>
              <div style="margin-bottom: 10px;">
                <strong>Dispatch Doc No.</strong><br>
              </div>
              <div>
                <strong>Dispatched through</strong><br>
              </div>
            </td>
            <td style="border: 1px solid black; padding: 5px; width: 25%; vertical-align: top;">
              <div style="margin-bottom: 10px;">
                <strong>Dated</strong><br>
                ${currentDate}
              </div>
              <div style="margin-bottom: 10px;">
                <strong>Dated</strong><br>
              </div>
              <div style="margin-bottom: 10px;">
                <strong>Delivery Note Date</strong><br>
              </div>
              <div>
                <strong>Destination</strong><br>
              </div>
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; margin-bottom: 10px;">
          <tr>
            <td style="border: 1px solid black; padding: 5px; width: 50%; vertical-align: top;">
              <strong>Consignee (Ship to)</strong><br><br>
              <strong>${extractedData.customerName}</strong><br>
              ${extractedData.customerAddress.length > 100 ? 
                extractedData.customerAddress.substring(0, 100) + '<br>' + 
                extractedData.customerAddress.substring(100) : 
                extractedData.customerAddress}
            </td>
            <td style="border: 1px solid black; padding: 5px; width: 50%; vertical-align: top;">
              <strong>Buyer (Bill to)</strong><br><br>
              <strong>${extractedData.customerName}</strong><br>
              ${extractedData.customerAddress.length > 100 ? 
                extractedData.customerAddress.substring(0, 100) + '<br>' + 
                extractedData.customerAddress.substring(100) : 
                extractedData.customerAddress}
            </td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid black;">
          <tr style="background-color: #f0f0f0;">
            <td style="border: 1px solid black; padding: 5px; text-align: center; width: 5%;"><strong>Sl</strong></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center; width: 35%;"><strong>Description of Goods</strong></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center; width: 15%;"><strong>HSN/SAC</strong></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center; width: 10%;"><strong>Quantity</strong></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center; width: 10%;"><strong>Rate</strong></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center; width: 5%;"><strong>per</strong></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center; width: 20%;"><strong>Amount</strong></td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding: 5px; text-align: center;">1</td>
            <td style="border: 1px solid black; padding: 5px; vertical-align: top;">
              <strong>${extractedData.manufacturer} ${extractedData.assetCategory}</strong><br><br>
              <strong>Model No:</strong> ${extractedData.model}<br>
              <strong>Serial No:</strong> ${extractedData.imeiSerialNumber}<br><br>
              <div style="display: flex; justify-content: space-between;">
                <div><strong>CGST</strong></div>
                <div>${taxDetails.cgst}</div>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <div><strong>SGST</strong></div>
                <div>${taxDetails.sgst}</div>
              </div>
            </td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;"></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;">1 PCS</td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;">${taxDetails.rate}</td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;">PCS</td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;">${taxDetails.rate}</td>
          </tr>
          <tr style="height: 200px;">
            <td style="border: 1px solid black; padding: 5px;" colspan="7"></td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding: 5px; text-align: right;" colspan="6"><strong>Total</strong></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;"><strong>₹ ${extractedData.assetCost.toFixed(2)}</strong></td>
          </tr>
        </table>

        <div style="margin: 10px 0;">
          <strong>Amount Chargeable (in words)</strong><br>
          <strong>INR ${numberToWords(extractedData.assetCost)}</strong>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; margin-bottom: 10px;">
          <tr style="background-color: #f0f0f0;">
            <td style="border: 1px solid black; padding: 5px; text-align: center;" rowspan="2"><strong>HSN/SAC</strong></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;" rowspan="2"><strong>Taxable Value</strong></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;" colspan="2"><strong>Central Tax</strong></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;" colspan="2"><strong>State Tax</strong></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;" rowspan="2"><strong>Total Tax Amount</strong></td>
          </tr>
          <tr style="background-color: #f0f0f0;">
            <td style="border: 1px solid black; padding: 5px; text-align: center;"><strong>Rate</strong></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;"><strong>Amount</strong></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;"><strong>Rate</strong></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;"><strong>Amount</strong></td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding: 5px; text-align: center;"></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;">${taxDetails.taxableValue}</td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;">${taxDetails.taxRate}%</td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;">${taxDetails.cgst}</td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;">${taxDetails.taxRate}%</td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;">${taxDetails.sgst}</td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;">${taxDetails.totalTaxAmount}</td>
          </tr>
          <tr>
            <td style="border: 1px solid black; padding: 5px; text-align: center;"><strong>Total</strong></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;"><strong>${taxDetails.taxableValue}</strong></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;"></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;"><strong>${taxDetails.cgst}</strong></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;"></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;"><strong>${taxDetails.sgst}</strong></td>
            <td style="border: 1px solid black; padding: 5px; text-align: center;"><strong>${taxDetails.totalTaxAmount}</strong></td>
          </tr>
        </table>

        <div style="margin: 10px 0;">
          <strong>Tax Amount(in words): INR ${numberToWords(parseFloat(taxDetails.totalTaxAmount))}</strong>
        </div>

        <table style="width: 100%; border-collapse: collapse; border: 2px solid black; margin-bottom: 20px;">
          <tr>
            <td style="border: 1px solid black; padding: 5px; width: 70%; vertical-align: top;">
              <div style="margin-bottom: 20px;">
                <strong>Declaration</strong><br>
                We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
              </div>
            </td>
            <td style="border: 1px solid black; padding: 5px; width: 30%; vertical-align: top; text-align: center;">
              <div style="margin-bottom: 20px;">
                <strong>for KATIYAR ELECTRONICS</strong><br><br><br><br>
                <strong>Authorised Signatory</strong>
              </div>
            </td>
          </tr>
        </table>

        <div style="text-align: center; font-size: 8px;">
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
              body { margin: 0; }
              @page { size: A4; margin: 0; }
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
            Professional Bill Generator
          </h1>

          {/* Upload Section */}
          <div className="mb-8">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf"
                className="hidden"
              />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">
                Upload PDF to extract bill information
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 mx-auto"
              >
                <FileText className="h-5 w-5" />
                Choose PDF File
              </button>
            </div>
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                Processing PDF...
              </div>
            </div>
          )}

          {/* Extracted Data Display */}
          {extractedData && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Extracted Information
              </h2>
              <div className="bg-gray-50 p-6 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <strong>Customer Name:</strong> {extractedData.customerName}
                </div>
                <div>
                  <strong>Manufacturer:</strong> {extractedData.manufacturer}
                </div>
                <div className="md:col-span-2">
                  <strong>Customer Address:</strong> {extractedData.customerAddress}
                </div>
                <div>
                  <strong>Asset Category:</strong> {extractedData.assetCategory}
                </div>
                <div>
                  <strong>Model:</strong> {extractedData.model}
                </div>
                <div>
                  <strong>Serial Number:</strong> {extractedData.imeiSerialNumber}
                </div>
                <div>
                  <strong>Asset Cost:</strong> ₹{extractedData.assetCost.toFixed(2)}
                </div>
              </div>

              {/* Invoice Number Input */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Enter invoice number"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setShowBillPreview(true)}
                  disabled={!invoiceNumber.trim()}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                >
                  <Eye className="h-5 w-5" />
                  Preview Bill
                </button>
                <button
                  onClick={handlePrint}
                  disabled={!invoiceNumber.trim()}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                >
                  <Download className="h-5 w-5" />
                  Print/Download
                </button>
              </div>
            </div>
          )}

          {/* Bill Preview */}
          {showBillPreview && extractedData && invoiceNumber && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Bill Preview</h2>
                <button
                  onClick={() => setShowBillPreview(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div 
                className="border border-gray-300 bg-white overflow-auto"
                style={{ maxHeight: '80vh' }}
                dangerouslySetInnerHTML={{ __html: generateBillHTML() }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillGenerator;