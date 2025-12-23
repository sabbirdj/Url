import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  alias: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, url, alias }) => {
  const downloadQR = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `qr-${alias}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-6 flex flex-col items-center gap-6">
              <div className="w-full flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">QR Code</h3>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-white p-4 rounded-xl border-2 border-indigo-50 shadow-inner">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={url}
                  size={200}
                  level="H"
                  includeMargin={true}
                  fgColor="#4338ca"
                />
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500 font-mono break-all">{url}</p>
                <p className="text-xs text-gray-400 mt-1">Scan to redirect</p>
              </div>

              <button
                onClick={downloadQR}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg transition-colors font-medium"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
