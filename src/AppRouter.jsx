import React, { useState, useContext, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import Lottie from 'lottie-react';
import { pinata } from './config';
import { db } from './firebase-config';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { PDFDocument } from 'pdf-lib';
import App from './App';
import AdminPanel from './AdminPanel';
import loadingAnimation from './Animation.json';
import './index.css';
import './App.css';
import './components.css';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';
import html2pdf from 'html2pdf.js';

const AuthContext = React.createContext(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = (password) => {
    if (password === "admin123") {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/admin-login" replace />;
  }
  return children;
};

const AdminLogin = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (login(password)) {
      navigate("/admin");
    } else {
      setError("Invalid password");
      setPassword("");
    }
  };

  return (
    <div className="admin-login min-h-screen flex items-center justify-center bg-gray-100">
      <div className="card bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-center">Admin Login</h2>
        {error && (
          <div className="alert alert-error bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group mb-6">
            <label htmlFor="password" className="form-label block mb-2 text-sm font-bold text-gray-700">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input w-full px-3 py-2 text-sm leading-tight text-gray-700 border rounded shadow appearance-none focus:outline-none focus:shadow-outline"
              placeholder="Enter admin password"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

const Navigation = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <nav 
        className={`fixed w-full top-0 z-50 transition-all duration-500 ${
          isScrolled 
            ? 'bg-white/80 backdrop-blur-md shadow-lg' 
            : 'bg-white'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link 
                to="/" 
                className="group flex items-center space-x-3 hover:opacity-90 transition-all duration-300"
              >
                <div className="relative">
                  
                  <div className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full"></div>
                </div>
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent">
                  Ezprints 2.0
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {[
                { to: "/", label: "Home", icon: "🏠" },
                { to: "/merge", label: "Merge PDFs", icon: "🔄" },
                { to: "/convert", label: "Convert to PDF", icon: "📄" },
                isAuthenticated && { to: "/admin", label: "Admin Panel", icon: "⚙️" }
              ].filter(Boolean).map((link) => (
                <Link 
                  key={link.to}
                  to={link.to} 
                  className="group relative px-4 py-2 text-gray-600 hover:text-blue-600 font-medium rounded-md transition-all duration-200"
                >
                  <span className="relative z-10 flex items-center space-x-1">
                    <span className="text-sm opacity-70 group-hover:opacity-100">{link.icon}</span>
                    <span>{link.label}</span>
                  </span>
                  <div className="absolute inset-0 h-full w-full bg-blue-50 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200"></div>
                  <div className="absolute bottom-0 left-0 h-0.5 w-full bg-blue-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></div>
                </Link>
              ))}
              
              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="ml-4 px-6 py-2 bg-gradient-to-r from-red-500 via-red-600 to-red-500 text-white rounded-full font-medium 
                    shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 
                    hover:bg-gradient-to-r hover:from-red-600 hover:via-red-700 hover:to-red-600 
                    focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
                >
                  Logout
                </button>
              )}
            </div>

            {/* Hamburger Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden group relative w-10 h-10 flex justify-center items-center rounded-lg hover:bg-gray-50 transition-colors duration-200"
              aria-label="Toggle Menu"
            >
              <div className="relative flex-none w-6 h-5">
                <span className={`hamburger-line top-0 ${isMenuOpen ? 'rotate-45 translate-y-2.5' : ''}`}></span>
                <span className={`hamburger-line top-2 ${isMenuOpen ? 'opacity-0 translate-x-2' : ''}`}></span>
                <span className={`hamburger-line top-4 ${isMenuOpen ? '-rotate-45 -translate-y-2.5' : ''}`}></span>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div 
          className={`md:hidden transition-all duration-300 ease-in-out ${
            isMenuOpen 
              ? 'opacity-100 translate-y-0 max-h-[400px]' 
              : 'opacity-0 -translate-y-4 max-h-0'
          } overflow-hidden`}
        >
          <div className="px-4 py-3 space-y-2 bg-white/90 backdrop-blur-md border-t border-gray-100 shadow-lg">
            {[
              { to: "/", label: "Home", icon: "🏠" },
              { to: "/merge", label: "Merge PDFs", icon: "🔄" },
              { to: "/convert", label: "Convert to PDF", icon: "📄" },
              isAuthenticated && { to: "/admin", label: "Admin Panel", icon: "⚙️" }
            ].filter(Boolean).map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50/80 
                  transition-all duration-200 group"
              >
                <span className="text-lg opacity-70 group-hover:opacity-100">{link.icon}</span>
                <span className="font-medium">{link.label}</span>
              </Link>
            ))}
            
            {isAuthenticated && (
              <button
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
                className="w-full mt-2 px-4 py-3 bg-gradient-to-r from-red-500 via-red-600 to-red-500 text-white rounded-xl 
                  font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 
                  hover:bg-gradient-to-r hover:from-red-600 hover:via-red-700 hover:to-red-600"
              >
                <span className="flex items-center justify-center space-x-2">
                  <span>🚪</span>
                  <span>Logout</span>
                </span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm md:hidden z-40 transition-opacity duration-300
          ${isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={() => setIsMenuOpen(false)}
      ></div>
    </>
  );
};

const Loading = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
    <Lottie 
      animationData={loadingAnimation} 
      loop={true} 
      autoplay={true} 
      style={{ width: 200, height: 200 }} 
    />
  </div>
);

const MergeFiles = () => {
  const [files, setFiles] = useState([]);
  const [mergedFileUrl, setMergedFileUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMergeOptions, setShowMergeOptions] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const mergePDFs = async (pdfFiles) => {
    const mergedPdf = await PDFDocument.create();
    
    for (const file of pdfFiles) {
      const pdfBytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    
    return await mergedPdf.save();
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      alert('Please select at least two PDF files to merge.');
      return;
    }

    setLoading(true);

    try {
      const mergedPdfBytes = await mergePDFs(files);
      const mergedPdfFile = new File([mergedPdfBytes], 'merged.pdf', { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', mergedPdfFile);

      const response = await pinata.post('/pinning/pinFileToIPFS', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
      setMergedFileUrl(ipfsUrl);

      const mergeJobData = {
        mergedFileUrl: ipfsUrl,
        timestamp: new Date().toISOString(),
        status: 'merged',
        originalFileCount: files.length,
      };

      const docRef = await addDoc(collection(db, "mergeJobs"), mergeJobData);
      setCurrentJobId(docRef.id);
      setShowMergeOptions(true);

    } catch (error) {
      console.error('Error merging files:', error);
      alert('Error merging files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (mergedFileUrl) {
      // Open in new tab with simple viewer
      const pdfWindow = window.open();
      pdfWindow.document.write(
        `<iframe width='100%' height='100%' src='${mergedFileUrl}'></iframe>`
      );
    }
  };

  const handleDownloadFile = () => {
    if (mergedFileUrl) {
      fetch(mergedFileUrl)
        .then(response => response.blob())
        .then(blob => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'merged_document.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        });
    }
  };

  const handlePrintOption = () => {
    if (mergedFileUrl) {
      sessionStorage.setItem('printFile', mergedFileUrl);
      navigate('/', { state: { fromMerge: true } });
    }
  };

  return (
    <div className="main-content relative min-h-screen bg-gray-100 py-12">
      {loading && <Loading />}
      
      <div className="container mx-auto px-4">
        <div className="bg-white shadow-lg rounded-lg p-8 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-center">Merge PDF Files</h2>
          <div className="space-y-6">
            <div className="form-group">
              <label htmlFor="files" className="form-label block mb-2 text-lg font-medium text-gray-700">
                Select PDF Files to Merge:
              </label>
              <input
                type="file"
                id="files"
                onChange={handleFileChange}
                multiple
                accept=".pdf"
                className="form-input block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
              />
            </div>

            <button
              onClick={handleMerge}
              disabled={files.length < 2 || loading}
              className={`btn btn-primary w-full py-3 px-4 text-lg font-semibold rounded-lg shadow-md ${
                files.length < 2 || loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {loading ? 'Merging...' : 'Merge PDFs'}
            </button>

            {showMergeOptions && (
              <div className="mt-6 space-y-4">
                <h3 className="text-2xl font-bold mb-4">Merged PDF Options</h3>
                <button 
                  onClick={handleDownload} 
                  className="btn btn-primary w-full py-3 px-4 text-lg font-semibold rounded-lg shadow-md bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
                >
                  View Merged PDF
                </button>
                <button 
                  onClick={handleDownloadFile} 
                  className="btn btn-primary w-full py-3 px-4 text-lg font-semibold rounded-lg shadow-md bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
                >
                  Download Merged PDF
                </button>
                <button 
                  onClick={handlePrintOption} 
                  className="btn btn-primary w-full py-3 px-4 text-lg font-semibold rounded-lg shadow-md bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
                >
                  Print Document
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ConvertDocument = () => {
  const [file, setFile] = useState(null);
  const [convertedFileUrl, setConvertedFileUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const supportedFormats = {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-excel': '.xls',
    'text/plain': '.txt',
    'application/rtf': '.rtf'
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && Object.keys(supportedFormats).includes(selectedFile.type)) {
      setFile(selectedFile);
      setError('');
    } else {
      setFile(null);
      setError('Please select a valid document format (Word, PowerPoint, Excel, TXT, RTF)');
    }
  };

  const convertToPDF = async (file) => {
    return new Promise(async (resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const arrayBuffer = e.target.result;
          let htmlContent = '';

          switch (file.type) {
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            case 'application/msword':
              // Convert Word to HTML first
              const result = await mammoth.convertToHtml({ arrayBuffer });
              htmlContent = result.value;
              break;

            case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
            case 'application/vnd.ms-powerpoint':
              // Create a simple container for the PowerPoint content
              htmlContent = `
                <div class="ppt-container" style="padding: 20px;">
                  <h1 style="text-align: center; color: #333;">${file.name}</h1>
                  <div style="text-align: center; margin: 40px 0;">
                    <p>PowerPoint presentations are being processed...</p>
                  </div>
                </div>
              `;

              // Configure PDF options specifically for PowerPoint files
              const opt = {
                margin: 0.5,
                filename: 'converted_presentation.pdf',
                image: { type: 'jpeg', quality: 1 },
                html2canvas: { 
                  scale: 2,
                  useCORS: true,
                  logging: true
                },
                jsPDF: { 
                  unit: 'in', 
                  format: 'a4', 
                  orientation: 'landscape'  // Better for presentations
                }
              };

              // Create element and convert to PDF
              const element = document.createElement('div');
              element.innerHTML = htmlContent;
              
              try {
                const pdf = await html2pdf().set(opt).from(element).output('blob');
                resolve(pdf);
              } catch (error) {
                console.error('PDF conversion error:', error);
                reject(new Error('Failed to convert PowerPoint to PDF'));
              }
              break;

            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            case 'application/vnd.ms-excel':
              const workbook = XLSX.read(arrayBuffer, { type: 'array' });
              htmlContent = '<div class="spreadsheet">';
              
              // Convert each worksheet to HTML table
              workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                htmlContent += `<h2>${sheetName}</h2>`;
                htmlContent += XLSX.utils.sheet_to_html(worksheet);
              });
              htmlContent += '</div>';
              break;

            case 'text/plain':
              const textContent = new TextDecoder().decode(arrayBuffer);
              htmlContent = `<pre>${textContent}</pre>`;
              break;

            default:
              throw new Error('Unsupported file format');
          }

          // Replace the puppeteer PDF generation with html2pdf
          const element = document.createElement('div');
          element.innerHTML = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; margin: 40px;">
              ${htmlContent}
            </div>
          `;

          const opt = {
            margin: 1,
            filename: 'converted.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
          };

          const pdf = await html2pdf().set(opt).from(element).output('blob');
          resolve(pdf);
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleConvert = async () => {
    if (!file) {
      setError('Please select a Word document to convert.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const convertedPdfBlob = await convertToPDF(file);
      const convertedPdfFile = new File([convertedPdfBlob], 'converted.pdf', { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', convertedPdfFile);

      const response = await pinata.post('/pinning/pinFileToIPFS', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
      setConvertedFileUrl(ipfsUrl);

      const conversionJobData = {
        convertedFileUrl: ipfsUrl,
        timestamp: new Date().toISOString(),
        status: 'converted',
        originalFileName: file.name,
      };

      await addDoc(collection(db, "conversionJobs"), conversionJobData);
      
    } catch (error) {
      console.error('Error converting file:', error);
      setError('Error converting file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (convertedFileUrl) {
      const pdfWindow = window.open();
      pdfWindow.document.write(
        `<iframe width='100%' height='100%' src='${convertedFileUrl}'></iframe>`
      );
    }
  };

  const handlePrint = () => {
    if (convertedFileUrl) {
      // Create a File object from the converted PDF URL
      fetch(convertedFileUrl)
        .then(response => response.blob())
        .then(blob => {
          const file = new File([blob], 'converted.pdf', { type: 'application/pdf' });
          // Store the file in sessionStorage (as URL)
          sessionStorage.setItem('printFile', convertedFileUrl);
          // Navigate to home page
          navigate('/', { state: { fromConversion: true } });
        });
    }
  };

  return (
    <div className="main-content relative min-h-screen bg-gray-100 py-12">
      {loading && <Loading />}
      
      <div className="container mx-auto px-4">
        <div className="bg-white shadow-lg rounded-lg p-8 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-center">Convert Document to PDF</h2>
          <div className="space-y-6">
            <div className="form-group">
              <label htmlFor="file" className="form-label block mb-2 text-lg font-medium text-gray-700">
                Select Document:
                <span className="block text-sm text-gray-500 mt-1">
                  Supported formats: .doc, .docx, .ppt, .pptx, .xls, .xlsx, .txt, .rtf
                </span>
              </label>
              <input
                type="file"
                id="file"
                onChange={handleFileChange}
                accept=".doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf"
                className="form-input block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
              />
              {error && <p className="text-red-500 mt-2">{error}</p>}
            </div>

            <button
              onClick={handleConvert}
              disabled={!file || loading}
              className={`btn btn-primary w-full py-3 px-4 text-lg font-semibold rounded-lg shadow-md ${(!file || loading) ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75'}`}
            >
              {loading ? 'Converting...' : 'Convert to PDF'}
            </button>

            {convertedFileUrl && (
              <div className="mt-6 space-y-4">
                <h3 className="text-2xl font-bold mb-4">Converted PDF</h3>
                <button 
                  onClick={handleDownload} 
                  className="btn btn-primary w-full py-3 px-4 text-lg font-semibold rounded-lg shadow-md bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
                >
                  View Converted PDF
                </button>
                <button 
                  onClick={handlePrint} 
                  className="btn btn-primary w-full py-3 px-4 text-lg font-semibold rounded-lg shadow-md bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
                >
                  Print Document
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Layout = ({ children }) => {
  return (
    <div className="app-container min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
};

const AppRouter = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <HashRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/merge" element={<MergeFiles />} />
            <Route path="/convert" element={<ConvertDocument />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Layout>
      </AuthProvider>
    </HashRouter>
  );
};

export default AppRouter;