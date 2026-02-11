import React, { useState, useRef } from 'react';
import { useWallet } from '@/context/WalletContext';
import { fileToBase64 } from '@/services/api';
import api from '@/services/api';
import type { CreateMemoryData } from '@/types';
import { 
  X, Upload, Image, FileText, Film, Music, File, 
  Loader2, ExternalLink, Shield, Check, AlertCircle, Coins 
} from 'lucide-react';
import { InputTransactionData } from '@aptos-labs/wallet-adapter-react';

interface AddMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateMemoryData) => Promise<{ 
    success: boolean; 
    message?: string; 
    data?: any 
  }>;
}

const CATEGORIES = [
  { value: 'photo', label: 'Photo', icon: Image },
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'video', label: 'Video', icon: Film },
  { value: 'audio', label: 'Audio', icon: Music },
  { value: 'other', label: 'Other', icon: File },
];

type BlockchainStep = 
  | 'idle' 
  | 'uploading-ipfs' 
  | 'connecting-wallet' 
  | 'funding-wallet' 
  | 'signing-tx' 
  | 'confirming' 
  | 'complete' 
  | 'error';

export const AddMemoryModal: React.FC<AddMemoryModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit 
}) => {
  const { 
    signAndSubmitTransaction, 
    account, 
    connected, 
    connect,
    fundWallet, 
    isPetraInstalled 
  } = useWallet();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('photo');
  const [storeOnChain, setStoreOnChain] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFundButton, setShowFundButton] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [blockchainStep, setBlockchainStep] = useState<BlockchainStep>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [ipfsHash, setIpfsHash] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MODULE_ADDRESS = import.meta.env.VITE_APTOS_MODULE_ADDRESS || 
    '0x599c19cd1f5a85d4eb4f403337bee2c26a8259b43c6cd0c9b6cdfd63d3874cc6';
  const MODULE_NAME = 'LifeVaultV2';
  const NETWORK = 'devnet'; 

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
      setCategory('photo');
    } else if (selectedFile.type.startsWith('video/')) {
      setPreview(null);
      setCategory('video');
    } else if (selectedFile.type.startsWith('audio/')) {
      setPreview(null);
      setCategory('audio');
    } else if (selectedFile.type.includes('pdf') || selectedFile.type.includes('document')) {
      setPreview(null);
      setCategory('document');
    } else {
      setPreview(null);
      setCategory('other');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileChange(droppedFile);
  };

  const handleFundWallet = async () => {
    setBlockchainStep('funding-wallet');
    setShowFundButton(false);
    setError('');
    
    await fundWallet();
    
    // Reset state to allow retry
    setBlockchainStep('idle'); 
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Please enter a title'); return; }
    if (!file) { setError('Please select a file'); return; }

    setLoading(true);
    setError('');
    setShowFundButton(false);

    try {
      // 1. Upload to IPFS (only if not already done)
      let currentIpfsHash = ipfsHash;
      if (!currentIpfsHash) {
        setBlockchainStep('uploading-ipfs');
        console.log('📤 Uploading to IPFS...');
        
        const base64 = await fileToBase64(file);
        
        const result = await onSubmit({
          title: title.trim(),
          description: description.trim(),
          category,
          fileData: base64,
          fileName: file.name,
          fileType: file.type,
          storeOnChain: false
        });

        if (!result.success) {
          throw new Error(result.message || 'Failed to create memory');
        }

        const memoryId = result.data?.memory?._id;
        currentIpfsHash = result.data?.ipfs?.hash;
        console.log('✅ IPFS upload complete:', currentIpfsHash);
        setIpfsHash(currentIpfsHash);
      }

      // 2. Blockchain Storage
      if (storeOnChain && currentIpfsHash) {
        try {
          console.log('\n🔗 ===== BLOCKCHAIN TRANSACTION START =====');
          
          if (!isPetraInstalled) throw new Error('Petra Wallet not installed');

          // Ensure wallet is connected
          if (!connected) {
            setBlockchainStep('connecting-wallet');
            await connect();
            // Wait a moment for connection to stabilize
            await new Promise(resolve => setTimeout(resolve, 1500));
          }

          if (!account) {
            // Last ditch effort to check if it connected but state hasn't updated
            throw new Error('Wallet connected but account not found. Please try again.');
          }

          setBlockchainStep('signing-tx');
          
          const funcName = `${MODULE_ADDRESS}::${MODULE_NAME}::store_memory`;
          
          const payload: InputTransactionData = {
            data: {
              function: funcName,
              functionArguments: [
                currentIpfsHash,
                description.trim() || 'Memory stored'
              ],
              typeArguments: []
            },
            options: {
              maxGasAmount: 50000,
              gasUnitPrice: 100
            }
          };

          console.log('📦 Payload:', JSON.stringify(payload, null, 2));

          const txResult = await signAndSubmitTransaction(payload);
          
          if (!txResult || !txResult.hash) {
            throw new Error('Transaction submitted but no hash returned');
          }

          const transactionHash = txResult.hash;
          console.log('✅ Transaction Hash:', transactionHash);
          setTxHash(transactionHash);
          setExplorerUrl(`https://explorer.aptoslabs.com/txn/${transactionHash}?network=${NETWORK}`);

          setBlockchainStep('confirming');
          
          // Background update to DB
          api.patch(`/api/memories/${title}`, { 
             txHash: transactionHash,
             isOnChain: true
          }).catch(console.warn);

          console.log('🎉 Blockchain Complete');
          setBlockchainStep('complete');

        } catch (blockchainError: any) {
          console.error('❌ Blockchain Error:', blockchainError);
          const errMsg = blockchainError.message || JSON.stringify(blockchainError);
          
          setBlockchainStep('error');
          
          // Check for Balance Error
          if (errMsg.includes('INSUFFICIENT_BALANCE') || errMsg.includes('balance') || errMsg.includes('gas')) {
             setError("Insufficient APT to pay for gas.");
             setShowFundButton(true); 
             setLoading(false);
             return;
          }

          setError(`Blockchain failed: ${errMsg.slice(0, 100)}`);
          setLoading(false);
          return;
        }
      }

      // Success Close
      setTimeout(() => {
        resetForm();
        onClose();
      }, storeOnChain ? 2000 : 500);

    } catch (err: any) {
      console.error('❌ Submit error:', err);
      setError(err.message || 'Failed to process file');
      setBlockchainStep('error');
    } finally {
      if (blockchainStep !== 'error') setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('photo');
    setStoreOnChain(false);
    setFile(null);
    setPreview(null);
    setError('');
    setBlockchainStep('idle');
    setTxHash(null);
    setExplorerUrl(null);
    setIpfsHash(null);
    setShowFundButton(false);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      
      <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-black/5">
          <h2 className="text-xl font-bold text-black">Add New Memory</h2>
          <button onClick={handleClose} disabled={loading} className="p-2 hover:bg-black/5 rounded-lg disabled:opacity-50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {blockchainStep === 'complete' && explorerUrl && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-500 rounded-lg"><Check className="w-5 h-5 text-white" /></div>
                <div className="flex-1">
                  <p className="font-medium text-green-900">Blockchain Proof Created!</p>
                  <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 mt-2 font-medium">
                    View on Aptos Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-600">{error}</p>
                  {showFundButton && (
                    <button 
                      onClick={handleFundWallet}
                      className="mt-3 w-full flex items-center justify-center gap-2 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      <Coins className="w-4 h-4" />
                      Get 1 Free APT (Devnet Faucet)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {loading && blockchainStep !== 'complete' && blockchainStep !== 'error' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900">
                    {blockchainStep === 'uploading-ipfs' && 'Uploading to IPFS...'}
                    {blockchainStep === 'connecting-wallet' && 'Connecting to Wallet...'}
                    {blockchainStep === 'funding-wallet' && 'Requesting Free APT...'}
                    {blockchainStep === 'signing-tx' && 'Please sign the transaction...'}
                    {blockchainStep === 'confirming' && 'Confirming on Blockchain...'}
                  </p>
                  {blockchainStep === 'signing-tx' && (
                    <p className="text-sm text-blue-700 mt-1">Check your Petra wallet extension</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!file ? (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-black bg-black/5' : 'border-black/20 hover:border-black/40'}`}
              onClick={() => !loading && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input ref={fileInputRef} type="file" onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])} accept="image/*,video/*,audio/*,.pdf,.doc,.docx" className="hidden" disabled={loading} />
              <Upload className="w-12 h-12 text-black/30 mx-auto mb-4" />
              <p className="font-medium text-black">Drop file here or click to browse</p>
            </div>
          ) : (
            <div className="space-y-3">
              {preview ? <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-lg" /> : <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center"><File className="w-10 h-10 text-gray-400" /></div>}
              {!loading && <button onClick={() => { setFile(null); setPreview(null); }} className="text-sm text-red-600 hover:underline">Remove file</button>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-black mb-2">Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Memory title" className="w-full px-4 py-3 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20" disabled={loading} />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add details..." rows={3} className="w-full px-4 py-3 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/20 resize-none" disabled={loading} />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button key={cat.value} type="button" onClick={() => setCategory(cat.value)} disabled={loading} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${category === cat.value ? 'bg-black text-white' : 'bg-black/5 text-black'}`}>
                  <cat.icon className="w-4 h-4" />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <p className="font-semibold text-black">Store on Blockchain</p>
                </div>
                <p className="text-xs text-black/50 mt-1">Immutable proof of ownership (Costs ~0.002 APT)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={storeOnChain} onChange={(e) => setStoreOnChain(e.target.checked)} disabled={loading} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-black/5">
          <button onClick={handleClose} disabled={loading} className="px-6 py-2.5 text-sm font-medium text-black hover:bg-black/5 rounded-lg transition-colors">
            {blockchainStep === 'complete' ? 'Close' : 'Cancel'}
          </button>
          <button onClick={handleSubmit} disabled={loading || !title.trim() || !file || blockchainStep === 'complete'} className="px-6 py-2.5 text-sm font-medium bg-black text-white rounded-lg hover:bg-black/80 transition-colors flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {blockchainStep === 'complete' ? 'Saved!' : 'Save Memory'}
          </button>
        </div>
      </div>
    </div>
  );
};