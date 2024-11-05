import React, { useState, useEffect, useRef } from 'react';
import { pinata } from './config';
import { db } from './firebase-config';
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import './tailwind.css';
import { useLocation } from 'react-router-dom';

function App() {
  const [file, setFile] = useState(null);
  const [uploadUrl, setUploadUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showFinishButton, setShowFinishButton] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [successJobDetails, setSuccessJobDetails] = useState(null);
  const [printDetails, setPrintDetails] = useState({
    copies: 1,
    colorMode: 'color',
    paperSize: 'a4',
    orientation: 'portrait',
    doubleSided: false,
    status: 'pending',
    timestamp: null,
    fileName: ''
  });
  const location = useLocation();
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (showPayment) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/payment-button.js';
      script.setAttribute('data-payment_button_id', 'pl_PBfgBOspC9Fahy');
      script.async = true;

      const paymentForm = document.getElementById('razorpay-form');
      paymentForm?.appendChild(script);

      const timer = setTimeout(() => {
        setShowPayment(false);
        setShowFinishButton(true);
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [showPayment]);

  useEffect(() => {
    if (location.state?.fromConversion || location.state?.fromMerge) {
      const printFileUrl = sessionStorage.getItem('printFile');
      if (printFileUrl) {
        fetch(printFileUrl)
          .then(response => response.blob())
          .then(blob => {
            const file = new File([blob], 
              location.state?.fromConversion ? 'converted.pdf' : 'merged.pdf', 
              { type: 'application/pdf' }
            );
            
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            
            if (fileInputRef.current) {
              fileInputRef.current.files = dataTransfer.files;
              const event = new Event('change', { bubbles: true });
              fileInputRef.current.dispatchEvent(event);
            }
            
            sessionStorage.removeItem('printFile');
          });
      }
    }
  }, [location]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileUrl = URL.createObjectURL(selectedFile);
      setUploadUrl(fileUrl);
      setFile(selectedFile);
      setPrintDetails(prev => ({
        ...prev,
        fileName: selectedFile?.name || ''
      }));
    }
  };

  const handlePrintDetailsChange = (field, value) => {
    setPrintDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUploadAndPreparePayment = async () => {
    if (!file) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const metadata = {
        keyvalues: {
          printRequirements: JSON.stringify(printDetails)
        }
      };
      formData.append('pinataMetadata', JSON.stringify(metadata));

      const response = await pinata.post('/pinning/pinFileToIPFS', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;

      const printJobData = {
        ...printDetails,
        ipfsUrl,
        timestamp: new Date().toISOString(),
        status: 'awaiting_payment',
        fileSize: file.size,
        fileType: file.type
      };

      const docRef = await addDoc(collection(db, "printJobs"), printJobData);
      setCurrentJobId(docRef.id);
      setShowPayment(true);

    } catch (error) {
      console.error('Error processing print job:', error);
      alert('Error processing print job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishClick = async () => {
    if (currentJobId) {
      try {
        const jobRef = doc(db, "printJobs", currentJobId);
        const paymentTimestamp = new Date().toISOString();
        const paymentAmount = calculatePaymentAmount(printDetails);

        await updateDoc(jobRef, {
          status: 'paid',
          paymentTimestamp,
          paymentAmount,
          paymentStatus: 'completed'
        });

        const docSnap = await getDoc(jobRef);
        const jobData = docSnap.data();

        setSuccessJobDetails({
          ...printDetails,
          status: 'paid',
          paymentTimestamp,
          paymentAmount,
          ipfsUrl: jobData.ipfsUrl
        });

        setShowPayment(false);
        setShowFinishButton(false);

      } catch (error) {
        console.error('Error updating print job:', error);
        alert('Error updating payment status. Please contact support.');
      }
    }
  };

  const calculatePaymentAmount = (details) => {
    let basePrice = details.colorMode === 'color' ? 10 : 5;
    basePrice *= details.copies;
    if (details.paperSize === 'legal') basePrice *= 1.2;
    if (details.doubleSided) basePrice *= 1.5;
    return basePrice;
  };

  const handlePreview = () => {
    if (uploadUrl) {
      window.open(uploadUrl, '_blank', 'noopener,noreferrer');
    } else {
      alert('Please upload a document first to preview.');
    }
  };

  const SuccessPage = ({ jobDetails }) => (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden m-4">
      {/* Success Header */}
      <div className="bg-gradient-to-r from-green-400 to-green-600 p-4 sm:p-8 text-center">
        <div className="bg-white rounded-full w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 flex items-center justify-center">
          <div className="text-4xl sm:text-5xl text-green-500">✓</div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Print Job Successfully Submitted!</h2>
        <p className="text-sm sm:text-base text-green-100">Your document is ready for printing</p>
      </div>

      <div className="p-4 sm:p-8">
        {/* Job Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8 bg-gray-50 p-4 sm:p-6 rounded-xl">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4 border-b pb-2">Print Details</h3>
            <div className="space-y-2 text-sm sm:text-base">
              <p className="flex justify-between">
                <span className="text-gray-600">File Name:</span>
                <span className="font-medium">{jobDetails?.fileName}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-600">Copies:</span>
                <span className="font-medium">{jobDetails?.copies}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-600">Color Mode:</span>
                <span className="font-medium capitalize">{jobDetails?.colorMode}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-600">Paper Size:</span>
                <span className="font-medium uppercase">{jobDetails?.paperSize}</span>
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4 border-b pb-2">Order Details</h3>
            <div className="space-y-2 text-sm sm:text-base">
              <p className="flex justify-between">
                <span className="text-gray-600">Orientation:</span>
                <span className="font-medium capitalize">{jobDetails?.orientation}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-600">Double-sided:</span>
                <span className="font-medium">{jobDetails?.doubleSided ? 'Yes' : 'No'}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-medium text-green-600">₹{jobDetails?.paymentAmount}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium text-green-600">Paid</span>
              </p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-6 sm:mb-8 bg-gray-50 p-4 sm:p-6 rounded-xl">
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4 border-b pb-2">Order Timeline</h3>
          <div className="space-y-3 sm:space-y-4 text-sm sm:text-base">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500 mr-3"></div>
              <p className="text-sm">
                <span className="font-medium">Submitted:</span>{' '}
                <span className="text-gray-600">{new Date(jobDetails?.timestamp).toLocaleString()}</span>
              </p>
            </div>
            <div className="flex items-center">
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500 mr-3"></div>
              <p className="text-sm">
                <span className="font-medium">Payment Completed:</span>{' '}
                <span className="text-gray-600">{new Date(jobDetails?.paymentTimestamp).toLocaleString()}</span>
              </p>
            </div>
          </div>
        </div>

        {/* PDF Preview */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-3 sm:mb-4 border-b pb-2">Document Preview</h3>
          <div className="bg-gray-50 p-2 sm:p-4 rounded-xl">
            <iframe
              src={jobDetails?.ipfsUrl}
              title="PDF Preview"
              className="w-full h-[300px] sm:h-[400px] md:h-[600px] rounded-lg border border-gray-200 shadow-inner"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button 
            onClick={() => setSuccessJobDetails(null)} 
            className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
          >
            Submit Another Print Job
          </button>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    return () => {
      if (uploadUrl) {
        URL.revokeObjectURL(uploadUrl);
      }
    };
  }, [uploadUrl]);

  return (
    <div className="container mx-auto px-4 py-6">
      {successJobDetails ? (
        <SuccessPage jobDetails={successJobDetails} />
      ) : (
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6">Print Job Upload</h1>
          <div className="space-y-4 bg-white p-4 sm:p-6 rounded-xl shadow-lg">
            {/* Form groups */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group col-span-1 sm:col-span-2">
                <label htmlFor="file" className="block mb-1 font-medium text-sm sm:text-base">Select File:</label>
                <input
                  type="file"
                  id="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="border border-gray-300 p-2 rounded-md w-full text-sm sm:text-base"
                  accept=".pdf,.doc,.docx"
                />
              </div>

              <div className="form-group">
                <label htmlFor="copies" className="block mb-1 font-medium text-sm sm:text-base">Number of Copies:</label>
                <input
                  type="number"
                  id="copies"
                  min="1"
                  value={printDetails.copies}
                  onChange={(e) => handlePrintDetailsChange('copies', parseInt(e.target.value))}
                  className="border border-gray-300 p-2 rounded-md w-full text-sm sm:text-base"
                />
              </div>

              <div className="form-group">
                <label htmlFor="colorMode" className="block mb-1 font-medium text-sm sm:text-base">Color Mode:</label>
                <select
                  id="colorMode"
                  value={printDetails.colorMode}
                  onChange={(e) => handlePrintDetailsChange('colorMode', e.target.value)}
                  className="border border-gray-300 p-2 rounded-md w-full text-sm sm:text-base"
                >
                  <option value="color">Color</option>
                  <option value="blackAndWhite">Black & White</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="paperSize" className="block mb-1 font-medium text-sm sm:text-base">Paper Size:</label>
                <select
                  id="paperSize"
                  value={printDetails.paperSize}
                  onChange={(e) => handlePrintDetailsChange('paperSize', e.target.value)}
                  className="border border-gray-300 p-2 rounded-md w-full text-sm sm:text-base"
                >
                  <option value="a4">A4</option>
                  <option value="letter">Letter</option>
                  <option value="legal">Legal</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="orientation" className="block mb-1 font-medium text-sm sm:text-base">Orientation:</label>
                <select
                  id="orientation"
                  value={printDetails.orientation}
                  onChange={(e) => handlePrintDetailsChange('orientation', e.target.value)}
                  className="border border-gray-300 p-2 rounded-md w-full text-sm sm:text-base"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>

              <div className="form-group">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={printDetails.doubleSided}
                    onChange={(e) => handlePrintDetailsChange('doubleSided', e.target.checked)}
                    className="rounded-md"
                  />
                  <span className="font-medium">Double-Sided</span>
                </label>
              </div>
            </div>

            {/* Buttons */}
            {showFinishButton ? (
              <button 
                onClick={handleFinishClick} 
                className="w-full sm:w-auto bg-green-500 text-white px-6 py-2 rounded-md text-sm sm:text-base"
              >
                Finish
              </button>
            ) : !showPayment && (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleUploadAndPreparePayment}
                  disabled={!file || loading}
                  className={`w-full sm:w-auto bg-blue-500 text-white px-6 py-2 rounded-md text-sm sm:text-base
                    ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                >
                  {loading ? 'Processing...' : 'Go for Payment'}
                </button>
                
              </div>
            )}

            {/* Payment Section */}
            {showPayment && (
              <div className="payment-section mt-6">
                <h3 className="text-xl font-medium mb-4">Complete Payment</h3>
                <form id="razorpay-form" className="w-full">
                  {/* Razorpay button will be injected here */}
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
