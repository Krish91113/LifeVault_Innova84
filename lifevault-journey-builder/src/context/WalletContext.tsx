import React, { createContext, useContext, ReactNode, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  AptosWalletAdapterProvider,
  useWallet as useAptosWallet,
  InputTransactionData,
  WalletReadyState
} from '@aptos-labs/wallet-adapter-react';
import { Network, Aptos, AptosConfig } from '@aptos-labs/ts-sdk';
import api from '@/services/api';
import { useToast } from '@/components/ui/use-toast';

interface WalletAccount {
  address: string;
  publicKey: string;
}

interface WalletContextType {
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  wallet: any;
  wallets: readonly any[];
  account: WalletAccount | null;
  network: {
    name: string;
    chainId?: number;
    url?: string;
  } | null;
  connect: (walletName?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<{
    signature: string;
    fullMessage: string;
    nonce: string;
    message: string;
  }>;
  signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<{ hash: string }>;
  authenticateWithWallet: () => Promise<{ success: boolean; token?: string; error?: string }>;
  linkWalletToAccount: () => Promise<{ success: boolean; error?: string }>;
  fundWallet: () => Promise<void>; // New Faucet Function
  isPetraInstalled: boolean;
  isWalletReady: boolean;
}

const WalletContext = createContext<WalletContextType | null>(null);

const checkPetraInWindow = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window.aptos || window.petra || (window as any).aptosWallet);
};

const toHexString = (data: any): string => {
  if (!data) return '';
  if (typeof data === 'string') return data.startsWith('0x') ? data : `0x${data}`;
  if (data instanceof Uint8Array) return '0x' + Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
  if (Array.isArray(data)) return '0x' + data.map(b => b.toString(16).padStart(2, '0')).join('');
  if (typeof data === 'object') {
    if (data.key) return toHexString(data.key);
    if (data.data) return toHexString(data.data);
    const keys = Object.keys(data);
    if (keys.every(k => !isNaN(Number(k)))) {
      const arr = keys.map(k => data[k]);
      return '0x' + arr.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  }
  return String(data);
};

const WalletContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    connect: aptosConnect,
    disconnect: aptosDisconnect,
    account: aptosAccount,
    connected,
    connecting,
    disconnecting,
    wallet,
    wallets,
    network,
    signMessage: aptosSignMessage,
    signAndSubmitTransaction: aptosSignAndSubmitTransaction,
  } = useAptosWallet();

  const { toast } = useToast();
  const [petraChecked, setPetraChecked] = useState(false);
  const [petraInWindow, setPetraInWindow] = useState(false);
  
  // Setup Aptos Client for Faucet (Devnet)
  // Memoized to prevent re-creation
  const aptosClient = useMemo(() => {
     const config = new AptosConfig({ network: Network.DEVNET });
     return new Aptos(config);
  }, []);

  const accountRef = useRef(aptosAccount);
  
  useEffect(() => {
    accountRef.current = aptosAccount;
  }, [aptosAccount]);

  const account = useMemo((): WalletAccount | null => {
    if (!aptosAccount?.address) return null;
    return { address: aptosAccount.address.toString(), publicKey: toHexString(aptosAccount.publicKey) };
  }, [aptosAccount]);

  useEffect(() => {
    const checkPetra = () => {
      const hasPetra = checkPetraInWindow();
      setPetraInWindow(hasPetra);
      setPetraChecked(true);
    };
    checkPetra();
    const t = setTimeout(checkPetra, 500);
    return () => clearTimeout(t);
  }, []);

  const isPetraInstalled = useMemo(() => {
    if (petraInWindow) return true;
    return wallets ? wallets.some(w => w.name?.toLowerCase().includes('petra')) : false;
  }, [wallets, petraInWindow]);

  const isWalletReady = useMemo(() => {
    return petraChecked && (wallets.length > 0 || petraInWindow);
  }, [petraChecked, wallets.length, petraInWindow]);

  const findPetraWallet = useCallback(() => {
    if (!wallets || wallets.length === 0) return null;
    return wallets.find(w => w.name?.toLowerCase().includes('petra'));
  }, [wallets]);

  // Wait for account to be available (Important for race conditions)
  const waitForAccount = useCallback(async (maxWait = 5000): Promise<WalletAccount | null> => {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      if (accountRef.current?.address) {
        return {
          address: accountRef.current.address.toString(),
          publicKey: toHexString(accountRef.current.publicKey)
        };
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return null;
  }, []);

  // NEW: Fund Wallet Function
  const fundWallet = useCallback(async () => {
    const currentAddr = accountRef.current?.address?.toString();
    if (!currentAddr) {
      toast({ title: "Error", description: "Please connect wallet first", variant: "destructive" });
      return;
    }

    try {
      console.log(`💰 Funding wallet ${currentAddr}...`);
      toast({ title: "Requesting Funds", description: "Asking Devnet Faucet for 1 APT..." });
      
      // Fund with 1 APT (100,000,000 Octas)
      await aptosClient.fundAccount({
        accountAddress: currentAddr,
        amount: 100_000_000, 
      });

      console.log("✅ Wallet funded successfully!");
      toast({ 
        title: "Success!", 
        description: "Added 1 APT to your wallet. You can now save your memory.",
        className: "bg-green-600 text-white"
      });
    } catch (error: any) {
      console.error("❌ Faucet error:", error);
      toast({ 
        title: "Funding Failed", 
        description: "Faucet might be busy. Please try again or use aptoslabs.com/testnet-faucet",
        variant: "destructive"
      });
    }
  }, [aptosClient, toast]);

  const connect = useCallback(async (walletName?: string) => {
    try {
      if (walletName) {
        await aptosConnect(walletName);
      } else {
        // Try to find Petra, otherwise default to first available or 'Petra' string
        const petra = findPetraWallet();
        if (petra) {
          await aptosConnect(petra.name);
        } else {
          // If wallets list is empty but we want to try connecting (e.g. extension just loaded)
          await aptosConnect('Petra'); 
        }
      }
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }, [aptosConnect, findPetraWallet]);

  const disconnect = useCallback(async () => {
    try {
      await aptosDisconnect();
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  }, [aptosDisconnect]);

  const signMessage = useCallback(async (message: string) => {
    const currentAccount = accountRef.current;
    if (!connected || !currentAccount) throw new Error('Wallet not connected');

    const nonce = Date.now().toString() + Math.random().toString(36).substring(2);
    const response = await aptosSignMessage({ message, nonce });

    let signature = '';
    if (response.signature) signature = toHexString(response.signature);
    else if ((response as any).signedMessage) signature = toHexString((response as any).signedMessage);

    return {
      signature: signature.startsWith('0x') ? signature.slice(2) : signature,
      fullMessage: response.fullMessage || message,
      nonce: response.nonce || nonce,
      message: message,
    };
  }, [connected, aptosSignMessage]);

  const signAndSubmitTransaction = useCallback(async (transaction: InputTransactionData) => {
    if (!connected) throw new Error('Wallet not connected');
    const response = await aptosSignAndSubmitTransaction(transaction);
    return { hash: response.hash };
  }, [connected, aptosSignAndSubmitTransaction]);

  // RESTORED: Authentication Logic
  const authenticateWithWallet = useCallback(async () => {
    try {
      console.log('=== Starting Wallet Authentication ===');
      
      if (!connected) await connect();
      
      const walletAccount = await waitForAccount();
      if (!walletAccount) return { success: false, error: 'Could not get wallet account' };

      const { address, publicKey } = walletAccount;
      const timestamp = Date.now();
      const message = `Sign this message to authenticate with LifeVault.\n\nWallet: ${address}\nTimestamp: ${timestamp}\n\nThis signature will not trigger any blockchain transaction or cost any gas fees.`;
      
      const signResult = await signMessage(message);

      const requestData = {
        address,
        publicKey: publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey,
        signature: signResult.signature,
        message: signResult.message,
        fullMessage: signResult.fullMessage,
        nonce: signResult.nonce,
      };

      const response = await api.post('/auth/wallet', requestData);
      const { token } = response.data.data;
      localStorage.setItem('token', token);

      return { success: true, token };
    } catch (error: any) {
      console.error('Auth failed:', error);
      return { success: false, error: error.message || 'Authentication failed' };
    }
  }, [connected, connect, waitForAccount, signMessage]);

  // RESTORED: Linking Logic
  const linkWalletToAccount = useCallback(async () => {
    try {
      if (!connected) await connect();
      const walletAccount = await waitForAccount();
      if (!walletAccount) return { success: false, error: 'Could not get wallet account' };

      const { address, publicKey } = walletAccount;
      const message = `Link this wallet to your LifeVault account.\n\nWallet: ${address}\nTimestamp: ${Date.now()}`;
      const signResult = await signMessage(message);

      const requestData = {
        address,
        publicKey: publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey,
        signature: signResult.signature,
        message: signResult.message,
        fullMessage: signResult.fullMessage,
        nonce: signResult.nonce,
      };

      await api.post('/auth/link-wallet', requestData);
      return { success: true };
    } catch (error: any) {
      console.error('Link failed:', error);
      return { success: false, error: error.message || 'Failed to link wallet' };
    }
  }, [connected, connect, waitForAccount, signMessage]);

  const value: WalletContextType = {
    connected,
    connecting,
    disconnecting,
    wallet,
    wallets,
    account,
    network: network ? { name: network.name, chainId: network.chainId, url: network.url } : null,
    connect,
    disconnect,
    signMessage,
    signAndSubmitTransaction,
    authenticateWithWallet,
    linkWalletToAccount,
    fundWallet, 
    isPetraInstalled,
    isWalletReady,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={{
        network: Network.DEVNET, 
        aptosConnect: { dappId: 'lifevault' },
      }}
      onError={(error) => {
        console.error('Wallet adapter error:', error);
        const msg = error?.message || String(error);
        // Suppress common "User rejected" messages to avoid spamming toast
        if (!msg.includes("User rejected")) {
           toast({ title: "Wallet Error", description: msg, variant: "destructive" });
        }
      }}
    >
      <WalletContextProvider>{children}</WalletContextProvider>
    </AptosWalletAdapterProvider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within a WalletProvider');
  return context;
};