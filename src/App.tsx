import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  History, 
  Wallet, 
  PlusCircle, 
  Search, 
  Camera as CameraIcon, 
  Save, 
  X, 
  ArrowUpRight, 
  ArrowDownLeft,
  ChevronRight,
  Menu,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Scan,
  Loader2,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

// --- AI Setup ---
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// --- Types ---

interface Produto {
  id: number;
  codigo_barras: string;
  nome: string;
  categoria: string;
  preco_venda: number;
  estoque_atual: number;
  fator_conversao: number;
  foto_url: string;
}

interface Venda {
  id: number;
  data_hora: string;
  forma_pagamento: string;
  valor_total: number;
  status_venda: string;
}

interface CaixaTurno {
  id: number;
  data_hora_abertura: string;
  fundo_inicial: number;
  status: 'Aberto' | 'Fechado';
  data_hora_fechamento?: string;
  diferenca_final?: number;
}

interface Movimentacao {
  id: number;
  id_caixa: number;
  tipo: 'Entrada' | 'Saída';
  forma_pagamento: string;
  valor: number;
  descricao: string;
}

interface EntradaEstoque {
  id: number;
  data_hora: string;
  id_produto: number;
  nome_produto?: string;
  tipo_entrada: 'Unidade' | 'Fardo';
  quantidade_informada: number;
  quantidade_real_adicionada: number;
  custo_total: number;
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
        : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'produtos' | 'vendas' | 'caixa' | 'estoque'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [caixaAtivo, setCaixaAtivo] = useState<CaixaTurno | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, caixaRes] = await Promise.all([
        fetch('/api/produtos'),
        fetch('/api/caixa/atual')
      ]);
      setProdutos(await prodRes.json());
      setCaixaAtivo(await caixaRes.json());
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard produtos={produtos} />;
      case 'produtos': return <ProdutosModule produtos={produtos} onUpdate={fetchData} />;
      case 'vendas': return <VendasModule produtos={produtos} caixaAtivo={caixaAtivo} onUpdate={fetchData} />;
      case 'caixa': return <CaixaModule caixaAtivo={caixaAtivo} onUpdate={fetchData} />;
      case 'estoque': return <EstoqueModule produtos={produtos} onUpdate={fetchData} />;
      default: return <Dashboard produtos={produtos} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 flex flex-col p-6 gap-8 transition-all duration-300 relative`}>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-24 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-emerald-600 shadow-sm z-10"
        >
          {isSidebarOpen ? <ChevronRight size={14} className="rotate-180" /> : <ChevronRight size={14} />}
        </button>

        <div className="flex items-center gap-3 px-2 overflow-hidden">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-100 shrink-0">
            <LayoutDashboard size={24} />
          </div>
          {isSidebarOpen && (
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold text-lg leading-tight tracking-tight whitespace-nowrap"
            >
              HUB SOBERANO<br/><span className="text-emerald-600">ADEGA</span>
            </motion.h1>
          )}
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          <SidebarItem icon={LayoutDashboard} label={isSidebarOpen ? "Dashboard" : ""} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={ShoppingCart} label={isSidebarOpen ? "PDV (Vendas)" : ""} active={activeTab === 'vendas'} onClick={() => setActiveTab('vendas')} />
          <SidebarItem icon={Package} label={isSidebarOpen ? "Produtos" : ""} active={activeTab === 'produtos'} onClick={() => setActiveTab('produtos')} />
          <SidebarItem icon={PlusCircle} label={isSidebarOpen ? "Entrada Estoque" : ""} active={activeTab === 'estoque'} onClick={() => setActiveTab('estoque')} />
          <SidebarItem icon={Wallet} label={isSidebarOpen ? "Caixa" : ""} active={activeTab === 'caixa'} onClick={() => setActiveTab('caixa')} />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100 overflow-hidden">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className={`w-3 h-3 rounded-full shrink-0 ${caixaAtivo ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            {isSidebarOpen && (
              <span className="text-sm font-medium text-slate-500 whitespace-nowrap">
                Caixa {caixaAtivo ? 'Aberto' : 'Fechado'}
              </span>
            )}
          </div>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors">
            <LogOut size={20} />
            {isSidebarOpen && <span className="font-medium">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold capitalize">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 w-64 transition-all"
              />
            </div>
            <button 
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
              className={`p-2 rounded-lg transition-colors ${isRightPanelOpen ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-slate-100'}`}
            >
              <Menu size={20} />
            </button>
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
              <img src="https://picsum.photos/seed/user/100" alt="User" referrerPolicy="no-referrer" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Right Sidebar (Aba do lado direito) */}
      <AnimatePresence>
        {isRightPanelOpen && (
          <motion.aside 
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-2xl z-40"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg">Resumo Rápido</h3>
              <button onClick={() => setIsRightPanelOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Quick Stats */}
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase text-slate-400 tracking-widest">Status do Sistema</p>
                <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Caixa</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${caixaAtivo ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {caixaAtivo ? 'ABERTO' : 'FECHADO'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Conexão</span>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={12} /> ONLINE
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase text-slate-400 tracking-widest">Ações Rápidas</p>
                <div className="grid grid-cols-1 gap-2">
                  <button className="flex items-center gap-3 p-3 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                    <History size={18} /> Histórico de Vendas
                  </button>
                  <button className="flex items-center gap-3 p-3 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                    <AlertCircle size={18} /> Relatar Problema
                  </button>
                </div>
              </div>

              {/* Notifications */}
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase text-slate-400 tracking-widest">Notificações</p>
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-xs font-bold text-amber-800 mb-1">Estoque Baixo</p>
                    <p className="text-[10px] text-amber-700">Cerveja Heineken 330ml está com menos de 5 unidades.</p>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <p className="text-xs font-bold text-emerald-800 mb-1">Caixa Aberto</p>
                    <p className="text-[10px] text-emerald-700">Turno iniciado com sucesso às {caixaAtivo ? new Date(caixaAtivo.data_hora_abertura).toLocaleTimeString() : '--:--'}.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <p className="text-[10px] text-center text-slate-400 font-medium">
                HUB SOBERANO v1.0.4<br/>Desenvolvido para Excelência
              </p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Modules ---

function Dashboard({ produtos }: { produtos: Produto[] }) {
  const lowStock = produtos.filter(p => p.estoque_atual < 10);
  
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Vendas Hoje" value="R$ 1.240,00" icon={ArrowUpRight} color="emerald" />
        <StatCard label="Produtos Ativos" value={produtos.length.toString()} icon={Package} color="blue" />
        <StatCard label="Estoque Baixo" value={lowStock.length.toString()} icon={AlertCircle} color="amber" />
        <StatCard label="Ticket Médio" value="R$ 42,50" icon={History} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Estoque Crítico</h3>
          <div className="space-y-4">
            {lowStock.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <img src={p.foto_url || `https://picsum.photos/seed/${p.id}/100`} alt={p.nome} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{p.nome}</p>
                    <p className="text-xs text-slate-500">{p.categoria}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${p.estoque_atual <= 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                    {p.estoque_atual} un
                  </p>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Restante</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Últimas Vendas</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center justify-between p-3 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Venda #102{i}</p>
                    <p className="text-xs text-slate-500">14:2{i} • PIX</p>
                  </div>
                </div>
                <p className="font-bold text-sm">R$ 89,90</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: 'emerald' | 'blue' | 'amber' | 'indigo' }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    indigo: 'bg-indigo-50 text-indigo-600'
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon size={20} />
        </div>
        <ChevronRight size={16} className="text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function ProdutosModule({ produtos, onUpdate }: { produtos: Produto[], onUpdate: () => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showProductGallery, setShowProductGallery] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Partial<Produto> | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    setIsScannerOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      alert("Não foi possível acessar a câmera.");
      setIsScannerOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsScannerOpen(false);
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsScanning(true);
    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    
    const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
    processImage(imageData);
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (imageData: string) => {
    setIsScanning(true);
    try {
      const model = "gemini-3-flash-preview";
      const prompt = "Analise esta imagem de produto de adega. Extraia as seguintes informações em formato JSON: nome (string), categoria (Cerveja, Destilado, Gelo, Tabacaria, Outros), codigo_barras (string ou null se não visível), preco_venda (number sugerido), fator_conversao (number, ex: 12 para fardo, 1 para unidade). Se for um fardo de cerveja, coloque fator_conversao como 12.";
      
      const response = await genAI.models.generateContent({
        model,
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: imageData } }
          ]
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nome: { type: Type.STRING },
              categoria: { type: Type.STRING },
              codigo_barras: { type: Type.STRING },
              preco_venda: { type: Type.NUMBER },
              fator_conversao: { type: Type.NUMBER }
            },
            required: ["nome", "categoria", "preco_venda", "fator_conversao"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      setEditingProduto({
        nome: result.nome,
        categoria: result.categoria,
        codigo_barras: result.codigo_barras || "",
        preco_venda: result.preco_venda,
        fator_conversao: result.fator_conversao,
        estoque_atual: 0
      });
      stopCamera();
      setIsModalOpen(true);
    } catch (err) {
      console.error("Erro no scanner AI:", err);
      alert("Erro ao processar imagem com IA.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const method = editingProduto?.id ? 'PUT' : 'POST';
    const url = editingProduto?.id ? `/api/produtos/${editingProduto.id}` : '/api/produtos';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        preco_venda: parseFloat(data.preco_venda as string),
        estoque_atual: parseInt(data.estoque_atual as string || '0'),
        fator_conversao: parseInt(data.fator_conversao as string || '1'),
      })
    });

    setIsModalOpen(false);
    setEditingProduto(null);
    onUpdate();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Gestão de Produtos</h3>
        <div className="flex gap-3">
          <button 
            onClick={startCamera}
            className="bg-slate-800 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-900 transition-colors shadow-lg shadow-slate-100"
          >
            <Scan size={20} />
            Escanear Produto (IA)
          </button>
          <button 
            onClick={() => { setEditingProduto(null); setIsModalOpen(true); }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
          >
            <PlusCircle size={20} />
            Novo Produto
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Produto</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Categoria</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Preço</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Estoque</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {produtos.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg border border-slate-200 overflow-hidden">
                      <img src={p.foto_url || `https://picsum.photos/seed/${p.id}/100`} alt={p.nome} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{p.nome}</p>
                      <p className="text-xs text-slate-400 font-mono">{p.codigo_barras}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                    {p.categoria}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-sm text-emerald-600">
                  R$ {(p.preco_venda || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  <span className={`font-bold text-sm ${p.estoque_atual < 10 ? 'text-rose-600' : 'text-slate-700'}`}>
                    {p.estoque_atual}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => { setEditingProduto(p); setIsModalOpen(true); }}
                    className="text-emerald-600 hover:text-emerald-800 font-medium text-sm"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h4 className="text-xl font-bold">{editingProduto ? 'Editar Produto' : 'Novo Produto'}</h4>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Código de Barras</label>
                <input name="codigo_barras" defaultValue={editingProduto?.codigo_barras} required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Nome do Produto</label>
                <input name="nome" defaultValue={editingProduto?.nome} required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Categoria</label>
                <select name="categoria" defaultValue={editingProduto?.categoria} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500">
                  <option value="Cerveja">Cerveja</option>
                  <option value="Destilado">Destilado</option>
                  <option value="Gelo">Gelo</option>
                  <option value="Tabacaria">Tabacaria</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Preço de Venda</label>
                <input name="preco_venda" type="number" step="0.01" defaultValue={editingProduto?.preco_venda} required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Estoque Inicial</label>
                <input name="estoque_atual" type="number" defaultValue={editingProduto?.estoque_atual} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Fator Conversão (Fardo)</label>
                <input name="fator_conversao" type="number" defaultValue={editingProduto?.fator_conversao || 1} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">URL da Foto</label>
                <input name="foto_url" defaultValue={editingProduto?.foto_url} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="col-span-2 pt-4">
                <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
                  Salvar Produto
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {isScannerOpen && (
        <div className="fixed inset-0 bg-black z-[60] flex flex-col">
          <div className="p-6 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-4">
              <h4 className="text-xl font-bold">Scanner IA</h4>
              <button 
                onClick={() => setShowProductGallery(!showProductGallery)}
                className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${
                  showProductGallery ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {showProductGallery ? 'Voltar para Câmera' : 'Ver Meus Produtos'}
              </button>
            </div>
            <button onClick={stopCamera} className="p-2 hover:bg-white/10 rounded-full">
              <X size={32} />
            </button>
          </div>
          
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            {!showProductGallery ? (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
                
                {/* Scanner Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-64 border-2 border-emerald-500 rounded-3xl relative">
                    <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
                    <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg" />
                    <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg" />
                    <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg" />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-lg" />
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full bg-slate-900 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                  <div className="flex justify-between items-center text-white">
                    <h5 className="text-lg font-bold">Galeria de Produtos Cadastrados</h5>
                    <p className="text-sm text-slate-400">{produtos.length} itens</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {produtos.map(p => (
                      <div key={p.id} className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 group">
                        <div className="aspect-square relative">
                          <img 
                            src={p.foto_url || `https://picsum.photos/seed/${p.id}/300`} 
                            alt={p.nome} 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-white font-bold text-sm leading-tight">{p.nome}</p>
                            <p className="text-emerald-400 text-xs font-bold">R$ {(p.preco_venda || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isScanning && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-4 z-10">
                <Loader2 size={48} className="animate-spin text-emerald-500" />
                <p className="font-bold text-lg">IA Analisando Produto...</p>
                <p className="text-sm text-slate-300">Identificando nome, preço e fardos</p>
              </div>
            )}
          </div>

          <div className="p-10 bg-black flex flex-col items-center gap-4 shrink-0">
            <div className="flex items-center gap-8">
              <label className="flex flex-col items-center gap-1 cursor-pointer group">
                <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors text-white">
                  <ImageIcon size={24} />
                </div>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Galeria</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
              </label>

              <button 
                onClick={captureAndScan}
                disabled={isScanning || showProductGallery}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-transform disabled:opacity-50"
              >
                <div className="w-16 h-16 border-4 border-black rounded-full flex items-center justify-center">
                  <div className="w-12 h-12 bg-emerald-600 rounded-full" />
                </div>
              </button>

              <div className="w-14 h-14" /> {/* Spacer */}
            </div>
            <p className="text-white/60 text-sm">
              {showProductGallery ? 'Visualize seus produtos cadastrados' : 'Tire uma foto ou escolha da galeria'}
            </p>
          </div>
          
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
}

function GaleriaModule({ produtos }: { produtos: Produto[] }) {
  const [filter, setFilter] = useState('Todos');
  const categories = ['Todos', ...Array.from(new Set(produtos.map(p => p.categoria)))];

  const filtered = filter === 'Todos' 
    ? produtos 
    : produtos.filter(p => p.categoria === filter);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
              filter === cat 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filtered.map(p => (
          <motion.div
            layout
            key={p.id}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-xl transition-all"
          >
            <div className="aspect-[4/5] relative overflow-hidden bg-slate-50">
              <img 
                src={p.foto_url || `https://picsum.photos/seed/${p.id}/400/500`} 
                alt={p.nome} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                  R$ {(p.preco_venda || 0).toFixed(2)}
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                <p className="text-white text-xs font-bold uppercase tracking-widest mb-1 opacity-70">{p.categoria}</p>
                <p className="text-white font-bold text-lg leading-tight">{p.nome}</p>
              </div>
            </div>
            <div className="p-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque</p>
                <p className={`font-bold text-sm ${p.estoque_atual < 5 ? 'text-rose-600' : 'text-slate-700'}`}>
                  {p.estoque_atual} un
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fardo</p>
                <p className="font-bold text-sm text-slate-700">
                  x{p.fator_conversao}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center space-y-4">
          <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <ImageIcon size={40} />
          </div>
          <p className="text-slate-500 font-medium">Nenhum produto encontrado nesta categoria.</p>
        </div>
      )}
    </div>
  );
}

function VendasModule({ produtos, caixaAtivo, onUpdate }: { produtos: Produto[], caixaAtivo: CaixaTurno | null, onUpdate: () => void }) {
  const [cart, setCart] = useState<{produto: Produto, quantidade: number}[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [search, setSearch] = useState('');

  const filteredProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(search.toLowerCase()) || 
    p.codigo_barras.includes(search)
  );

  const addToCart = (produto: Produto) => {
    setCart(prev => {
      const existing = prev.find(item => item.produto.id === produto.id);
      if (existing) {
        return prev.map(item => 
          item.produto.id === produto.id 
            ? { ...item, quantidade: item.quantidade + 1 } 
            : item
        );
      }
      return [...prev, { produto, quantidade: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.produto.id !== id));
  };

  const total = cart.reduce((acc, item) => acc + (item.produto.preco_venda * item.quantidade), 0);

  const finishSale = async () => {
    if (!caixaAtivo) return alert("Abra o caixa antes de vender!");
    if (cart.length === 0) return;

    const saleData = {
      forma_pagamento: paymentMethod,
      valor_total: total,
      itens: cart.map(item => ({
        id_produto: item.produto.id,
        quantidade: item.quantidade,
        subtotal: item.produto.preco_venda * item.quantidade
      }))
    };

    await fetch('/api/vendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData)
    });

    setCart([]);
    onUpdate();
    alert("Venda realizada com sucesso!");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
      {/* Product Selection */}
      <div className="lg:col-span-2 flex flex-col gap-6 overflow-hidden">
        <div className="relative shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou código de barras..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2 pb-4">
          {filteredProdutos.map(p => (
            <button 
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all text-left group"
            >
              <div className="aspect-square bg-slate-50 rounded-xl mb-4 overflow-hidden border border-slate-100">
                <img src={p.foto_url || `https://picsum.photos/seed/${p.id}/200`} alt={p.nome} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-bold text-sm mb-1 line-clamp-1">{p.nome}</p>
              <p className="text-xs text-slate-500 mb-2">{p.categoria}</p>
              <div className="flex justify-between items-center">
                <p className="text-emerald-600 font-bold">R$ {(p.preco_venda || 0).toFixed(2)}</p>
                <p className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.estoque_atual < 5 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>
                  {p.estoque_atual} un
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart size={20} className="text-emerald-600" />
            Carrinho
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
              <ShoppingCart size={48} strokeWidth={1} />
              <p className="text-sm font-medium">Seu carrinho está vazio</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.produto.id} className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-xl">
                <div className="flex-1">
                  <p className="font-bold text-sm line-clamp-1">{item.produto.nome}</p>
                  <p className="text-xs text-slate-500">
                    {item.quantidade}x R$ {(item.produto.preco_venda || 0).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-sm">R$ {((item.produto.preco_venda || 0) * item.quantidade).toFixed(2)}</p>
                  <button onClick={() => removeFromCart(item.produto.id)} className="text-rose-500 hover:bg-rose-50 p-1 rounded">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase text-slate-500">Forma de Pagamento</p>
            <div className="grid grid-cols-2 gap-2">
              {['Dinheiro', 'PIX', 'Débito', 'Crédito'].map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    paymentMethod === method 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-200'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <p className="text-slate-500 font-medium">Total</p>
            <p className="text-3xl font-black text-emerald-600">R$ {(total || 0).toFixed(2)}</p>
          </div>

          <button 
            onClick={finishSale}
            disabled={cart.length === 0 || !caixaAtivo}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {caixaAtivo ? 'Finalizar Venda' : 'Abrir Caixa Primeiro'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CaixaModule({ caixaAtivo, onUpdate }: { caixaAtivo: CaixaTurno | null, onUpdate: () => void }) {
  const [fundo, setFundo] = useState('');
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);

  useEffect(() => {
    if (caixaAtivo) {
      fetch(`/api/movimentacoes/${caixaAtivo.id}`)
        .then(res => res.json())
        .then(setMovimentacoes);
    }
  }, [caixaAtivo]);

  const abrirCaixa = async () => {
    await fetch('/api/caixa/abrir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fundo_inicial: parseFloat(fundo) })
    });
    onUpdate();
  };

  const fecharCaixa = async () => {
    const diferenca = prompt("Qual a diferença final no caixa? (0 se estiver correto)");
    if (diferenca === null) return;

    await fetch('/api/caixa/fechar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id: caixaAtivo?.id, 
        diferenca_final: parseFloat(diferenca) 
      })
    });
    onUpdate();
  };

  if (!caixaAtivo) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full text-center space-y-8">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto">
            <Wallet size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">Abrir Novo Turno</h3>
            <p className="text-slate-500">Informe o fundo inicial para começar a vender.</p>
          </div>
          <div className="space-y-4">
            <div className="text-left space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500">Fundo Inicial (Troco)</label>
              <input 
                type="number" 
                value={fundo}
                onChange={(e) => setFundo(e.target.value)}
                placeholder="R$ 0,00"
                className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-xl font-bold focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button 
              onClick={abrirCaixa}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
            >
              Abrir Caixa
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold">Controle de Caixa</h3>
          <p className="text-slate-500">Turno iniciado em {new Date(caixaAtivo.data_hora_abertura).toLocaleString()}</p>
        </div>
        <button 
          onClick={fecharCaixa}
          className="bg-rose-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-100"
        >
          Fechar Turno
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Fundo Inicial</p>
          <p className="text-2xl font-bold text-slate-900">R$ {(caixaAtivo.fundo_inicial || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Entradas (Vendas)</p>
          <p className="text-2xl font-bold text-emerald-600">R$ 0,00</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Saldo Atual</p>
          <p className="text-2xl font-bold text-emerald-600">R$ {(caixaAtivo.fundo_inicial || 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h4 className="font-bold">Movimentações do Turno</h4>
          <button className="text-emerald-600 text-sm font-bold flex items-center gap-1">
            <PlusCircle size={16} />
            Nova Sangria/Aporte
          </button>
        </div>
        <div className="p-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Descrição</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Pagamento</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movimentacoes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    Nenhuma movimentação registrada neste turno.
                  </td>
                </tr>
              ) : (
                movimentacoes.map(m => (
                  <tr key={m.id}>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${m.tipo === 'Entrada' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{m.descricao}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{m.forma_pagamento}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${m.tipo === 'Entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {m.tipo === 'Saída' ? '-' : '+'} R$ {(m.valor || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EstoqueModule({ produtos, onUpdate }: { produtos: Produto[], onUpdate: () => void }) {
  const [entradas, setEntradas] = useState<EntradaEstoque[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/estoque/entradas')
      .then(res => res.json())
      .then(setEntradas);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const id_produto = parseInt(data.id_produto as string);
    const produto = produtos.find(p => p.id === id_produto);
    const tipo_entrada = data.tipo_entrada as 'Unidade' | 'Fardo';
    const quantidade_informada = parseInt(data.quantidade_informada as string);
    const quantidade_real_adicionada = tipo_entrada === 'Fardo' 
      ? quantidade_informada * (produto?.fator_conversao || 1)
      : quantidade_informada;

    await fetch('/api/estoque/entrada', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_produto,
        tipo_entrada,
        quantidade_informada,
        quantidade_real_adicionada,
        custo_total: parseFloat(data.custo_total as string)
      })
    });

    setIsModalOpen(false);
    onUpdate();
    // Refresh local entries
    fetch('/api/estoque/entradas').then(res => res.json()).then(setEntradas);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Entradas de Estoque</h3>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
        >
          <PlusCircle size={20} />
          Nova Entrada
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Data</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Produto</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Tipo</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Qtd. Adicionada</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Custo Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entradas.map(e => (
              <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-500">
                  {new Date(e.data_hora).toLocaleString()}
                </td>
                <td className="px-6 py-4 font-semibold text-sm">{e.nome_produto}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${e.tipo_entrada === 'Fardo' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
                    {e.tipo_entrada}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-sm text-emerald-600">
                  +{e.quantidade_real_adicionada} un
                </td>
                <td className="px-6 py-4 text-sm font-bold">
                  R$ {(e.custo_total || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h4 className="text-xl font-bold">Registrar Entrada</h4>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Produto</label>
                <select name="id_produto" required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500">
                  <option value="">Selecione um produto...</option>
                  {produtos.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} (Fator: {p.fator_conversao})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-500">Tipo de Entrada</label>
                  <select name="tipo_entrada" className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500">
                    <option value="Unidade">Unidade</option>
                    <option value="Fardo">Fardo</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-slate-500">Quantidade</label>
                  <input name="quantidade_informada" type="number" required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Custo Total da Compra</label>
                <input name="custo_total" type="number" step="0.01" required className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
                  Confirmar Entrada
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
