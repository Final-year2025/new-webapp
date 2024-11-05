import React, { useState, useEffect, useRef } from 'react';
import { pinata } from './config';
import { db } from './firebase-config';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
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

        setSuccessJobDetails({
          ...printDetails,
          status: 'paid',
          paymentTimestamp,
          paymentAmount
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
    <div className="bg-green-100 p-6 rounded-lg shadow-md text-center">
      <div className="text-5xl text-green-500">✓</div>
      <h2 className="text-2xl font-bold my-4">Print Job Successfully Submitted!</h2>
      <div className="text-left">
        <p><strong>File Name:</strong> {jobDetails?.fileName}</p>
        <p><strong>Copies:</strong> {jobDetails?.copies}</p>
        <p><strong>Color Mode:</strong> {jobDetails?.colorMode}</p>
        <p><strong>Paper Size:</strong> {jobDetails?.paperSize}</p>
        <p><strong>Orientation:</strong> {jobDetails?.orientation}</p>
        <p><strong>Double-sided:</strong> {jobDetails?.doubleSided ? 'Yes' : 'No'}</p>
        <p><strong>Amount Paid:</strong> ₹{jobDetails?.paymentAmount}</p>
        <p><strong>Submitted:</strong> {new Date(jobDetails?.timestamp).toLocaleString()}</p>
        <p><strong>Payment Completed:</strong> {new Date(jobDetails?.paymentTimestamp).toLocaleString()}</p>
      </div>
      <button onClick={() => setSuccessJobDetails(null)} className="bg-blue-500 text-white px-4 py-2 mt-4 rounded-md">
        Submit Another Print Job
      </button>
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
    <div className="container mx-auto p-4">
      {successJobDetails ? (
        <SuccessPage jobDetails={successJobDetails} />
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-6">Print Job Upload</h1>
          <div className="space-y-4">
            <div className="form-group">
              <label htmlFor="file" className="block mb-1 font-medium">Select File:</label>
              <input
                type="file"
                id="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="border border-gray-300 p-2 rounded-md w-full"
                accept=".pdf,.doc,.docx"
              />
            </div>

            <div className="form-group">
              <label htmlFor="copies" className="block mb-1 font-medium">Number of Copies:</label>
              <input
                type="number"
                id="copies"
                min="1"
                value={printDetails.copies}
                onChange={(e) => handlePrintDetailsChange('copies', parseInt(e.target.value))}
                className="border border-gray-300 p-2 rounded-md w-full"
              />
            </div>

            <div className="form-group">
              <label htmlFor="colorMode" className="block mb-1 font-medium">Color Mode:</label>
              <select
                id="colorMode"
                value={printDetails.colorMode}
                onChange={(e) => handlePrintDetailsChange('colorMode', e.target.value)}
                className="border border-gray-300 p-2 rounded-md w-full"
              >
                <option value="color">Color</option>
                <option value="blackAndWhite">Black & White</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="paperSize" className="block mb-1 font-medium">Paper Size:</label>
              <select
                id="paperSize"
                value={printDetails.paperSize}
                onChange={(e) => handlePrintDetailsChange('paperSize', e.target.value)}
                className="border border-gray-300 p-2 rounded-md w-full"
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
                <option value="legal">Legal</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="orientation" className="block mb-1 font-medium">Orientation:</label>
              <select
                id="orientation"
                value={printDetails.orientation}
                onChange={(e) => handlePrintDetailsChange('orientation', e.target.value)}
                className="border border-gray-300 p-2 rounded-md w-full"
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

            {showFinishButton ? (
              <button onClick={handleFinishClick} className="bg-green-500 text-white px-4 py-2 rounded-md">
                Finish
              </button>
            ) : !showPayment && (
              <div className="flex space-x-4">
                <button
                  onClick={handleUploadAndPreparePayment}
                  disabled={!file || loading}
                  className={`bg-blue-500 text-white px-4 py-2 rounded-md ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'Processing...' : 'Go for Payment'}
                </button>
                <button
                  onClick={handlePreview}
                  disabled={!uploadUrl}
                  className={`bg-blue-500 text-white px-4 py-2 rounded-md 
                    ${!uploadUrl ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                >
                  Preview Document
                </button>
              </div>
            )}

            {showPayment && (
              <div className="payment-section">
                <h3 className="text-xl font-medium mb-2">Complete Payment</h3>
                <form id="razorpay-form">
                  {/* Razorpay button will be injected here */}
                </form>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
