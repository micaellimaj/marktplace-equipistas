'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminService } from '@/services/adminService';
import { AdminUser, UserStatus } from '@/types/admin';
import { ProductCategory } from '@/types/products';
import { 
  Loader2, 
  ArrowLeft, 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  Trash2, 
  UserX, 
  UserCheck,
  Package,
  MapPin,
  Pencil,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'COMIDA', label: 'Comida' },
  { value: 'ROUPAS', label: 'Roupas' },
  { value: 'COSMETICOS', label: 'Cosméticos' },
  { value: 'ELETRONICOS', label: 'Eletrônicos' },
  { value: 'SAUDE', label: 'Saúde' },
  { value: 'CASA', label: 'Casa' },
  { value: 'BRINQUEDOS', label: 'Brinquedos' },
  { value: 'LIVROS', label: 'Livros' },
  { value: 'ESPORTES', label: 'Esportes' },
  { value: 'AUTOMOTIVO', label: 'Automotivo' },
  { value: 'OUTROS', label: 'Outros' },
];

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface DeleteConfirmationState {
  id: string;
  nome: string;
}

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActionSubmitting, setIsActionSubmitting] = useState<string | null>(null);
  
  // Estado do Toast de Notificação
  const [toast, setToast] = useState<ToastState | null>(null);
  
  // Estado para controle do Modal de Deleção Customizado
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmationState | null>(null);
  
  // Controle do Super Modal de Edição Avançada
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'profile' | 'addresses' | 'products'>('profile');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Estados locais para os formulários clonados dentro do modal
  const [profileForm, setProfileForm] = useState({ nome: '', telefone: '', email: '', cpf: '' });
  const [addressesForm, setAddressesForm] = useState<any[]>([]);
  const [productsForm, setProductsForm] = useState<any[]>([]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  async function loadUsers() {
    try {
      const data = await adminService.listAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('[ADMIN] Erro ao carregar usuários:', error);
      showNotification('Erro ao carregar a lista de usuários.', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'ADMIN') {
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      loadUsers();
    }
  }, [user]);

  const handleChangeStatus = async (id: string, currentStatus: UserStatus) => {
    const nextStatus: UserStatus = currentStatus === 'ATIVO' ? 'INATIVO' : 'ATIVO';
    setIsActionSubmitting(id);
    try {
      await adminService.changeStatus(id, nextStatus);
      showNotification(`Status do usuário alterado para ${nextStatus} com sucesso!`);
      await loadUsers();
    } catch (error) {
      console.error('[ADMIN] Erro ao alterar status:', error);
      showNotification('Não foi possível alterar o status do usuário.', 'error');
    } finally {
      setIsActionSubmitting(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;
    
    const { id, nome } = deleteConfirmation;
    setDeleteConfirmation(null);
    setIsActionSubmitting(id);
    
    try {
      await adminService.deleteUser(id);
      showNotification(`Usuário "${nome}" e seus dados vinculados foram removidos.`);
      await loadUsers();
    } catch (error) {
      console.error('[ADMIN] Erro ao deletar usuário:', error);
      showNotification('Erro ao tentar excluir o usuário do sistema.', 'error');
    } finally {
      setIsActionSubmitting(null);
    }
  };

  const handleOpenEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setActiveModalTab('profile');
    setProfileForm({
      nome: user.nome,
      telefone: user.telefone,
      email: user.email || '',
      cpf: user.cpf || ''
    });
    setAddressesForm(user.addresses ? JSON.parse(JSON.stringify(user.addresses)) : []);
    setProductsForm(user.products ? JSON.parse(JSON.stringify(user.products)) : []);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsEditSubmitting(true);
    try {
      await adminService.updateUser(editingUser.id, {
        nome: profileForm.nome,
        telefone: profileForm.telefone,
        addresses: addressesForm.map(({ id, createdAt, updatedAt, userId, ...rest }) => rest),
        products: productsForm.map(({ id, createdAt, updatedAt, userId, ...rest }) => rest)
      });
      showNotification('Cadastro completo sincronizado com sucesso!');
      setEditingUser(null);
      await loadUsers();
    } catch (error) {
      console.error('[ADMIN] Erro ao sincronizar dados:', error);
      showNotification('Erro ao tentar salvar alterações no servidor.', 'error');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleAddAddressRow = () => {
    setAddressesForm([...addressesForm, { cep: '', rua: '', numero: '', bairro: '', cidade: '', estado: 'PE', complemento: '' }]);
    showNotification('Novo rascunho de endereço incluído na lista.');
  };

  const handleRemoveAddressRow = (index: number) => {
    setAddressesForm(addressesForm.filter((_, i) => i !== index));
    showNotification('Endereço removido do rascunho atual.', 'error');
  };

  const handleAddProductRow = () => {
    setProductsForm([...productsForm, { nome: '', preco: 0, descricao: '', categoria: 'OUTROS', imagens: [] }]);
    showNotification('Novo rascunho de produto incluído na lista.');
  };

  const handleRemoveProductRow = (index: number) => {
    setProductsForm(productsForm.filter((_, i) => i !== index));
    showNotification('Produto removido do rascunho atual.', 'error');
  };

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'ATIVO').length;
  const totalGlobalProducts = users.reduce((sum, u) => sum + (u.products?.length || 0), 0);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 text-foreground">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Marketplace
            </Link>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Painel de Administração</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie usuários, modifique cadastros, endereços e os produtos vinculados de forma unificada.
            </p>
          </div>
        </div>

        {/* Painel de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
                <p className="text-sm text-muted-foreground">Usuários Cadastrados</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activeUsers}</p>
                <p className="text-sm text-muted-foreground">Contas Ativas</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center">
                <Package className="h-5 w-5 text-amber-500 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalGlobalProducts}</p>
                <p className="text-sm text-muted-foreground">Produtos na Plataforma</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela Principal */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/40">
            <h2 className="font-semibold text-foreground">Lista de Usuários</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-sm text-muted-foreground bg-muted/20">
                  <th className="p-4 font-medium">Nome / Dados</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium hidden sm:table-cell">Vínculos</th>
                  <th className="p-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/40 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-foreground">{user.nome}</div>
                      <div className="text-xs text-muted-foreground">{user.email} • CPF: {user.cpf}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === 'ATIVO' 
                          ? 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400' 
                          : 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive-foreground'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4 hidden sm:table-cell text-muted-foreground">
                      <div className="flex flex-col gap-1 text-xs">
                        <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {user.products?.length || 0} Produtos</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {user.addresses?.length || 0} Endereços</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          disabled={isActionSubmitting === user.id}
                          className="p-2 rounded-lg border border-input bg-background hover:bg-muted text-foreground transition-colors disabled:opacity-50"
                          title="Gerenciamento Avançado (Perfil, Endereços e Produtos)"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleChangeStatus(user.id, user.status)}
                          disabled={isActionSubmitting === user.id}
                          className="p-2 rounded-lg border border-input bg-background hover:bg-muted text-foreground transition-colors disabled:opacity-50"
                        >
                          {user.status === 'ATIVO' ? <UserX className="h-4 w-4 text-amber-500 dark:text-amber-400" /> : <UserCheck className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />}
                        </button>
                        
                        <button
                          onClick={() => setDeleteConfirmation({ id: user.id, nome: user.nome })}
                          disabled={isActionSubmitting === user.id}
                          className="p-2 rounded-lg border border-input bg-background hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                        >
                          {isActionSubmitting === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Gerenciamento Avançado (Suspenso) */}
        {editingUser && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              
              <div className="p-6 border-b border-border bg-muted/20">
                <h3 className="text-lg font-bold text-foreground">Gerenciar Conta: {editingUser.nome}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">ID: {editingUser.id}</p>
                
                {/* Abas Suspensas Internas */}
                <div className="flex gap-4 border-b border-border mt-4">
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('profile')}
                    className={`pb-2 text-xs font-semibold relative transition-colors ${activeModalTab === 'profile' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Dados Cadastrais
                    {activeModalTab === 'profile' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('addresses')}
                    className={`pb-2 text-xs font-semibold relative flex items-center gap-1 transition-colors ${activeModalTab === 'addresses' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Endereços ({addressesForm.length})
                    {activeModalTab === 'addresses' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('products')}
                    className={`pb-2 text-xs font-semibold relative flex items-center gap-1 transition-colors ${activeModalTab === 'products' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Produtos ({productsForm.length})
                    {activeModalTab === 'products' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
                  </button>
                </div>
              </div>

              {/* Área Rolável do Formulário */}
              <form onSubmit={handleUpdateSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 bg-background/50">
                
                {/* ABA 1: PERFIL */}
                {activeModalTab === 'profile' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Nome Completo</label>
                      <input
                        type="text"
                        value={profileForm.nome}
                        onChange={(e) => setProfileForm({ ...profileForm, nome: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Telefone</label>
                      <input
                        type="text"
                        value={profileForm.telefone}
                        onChange={(e) => setProfileForm({ ...profileForm, telefone: e.target.value })}
                        className="w-full px-3 py-2 border border-input rounded-lg bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        required
                      />
                    </div>
                    <div className="space-y-1 opacity-50">
                      <label className="text-xs font-medium text-muted-foreground">E-mail (Não editável)</label>
                      <input type="text" value={profileForm.email} disabled className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-sm text-muted-foreground cursor-not-allowed" />
                    </div>
                    <div className="space-y-1 opacity-50">
                      <label className="text-xs font-medium text-muted-foreground">CPF (Não editável)</label>
                      <input type="text" value={profileForm.cpf} disabled className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-sm text-muted-foreground cursor-not-allowed" />
                    </div>
                  </div>
                )}

                {/* ABA 2: ENDEREÇOS */}
                {activeModalTab === 'addresses' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Endereços Associados</h4>
                      <button type="button" onClick={handleAddAddressRow} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors">
                        <Plus className="h-3 w-3" /> Incluir Endereço
                      </button>
                    </div>
                    
                    {addressesForm.map((address, idx) => (
                      <div key={idx} className="p-4 border border-border rounded-xl bg-muted/20 relative space-y-3">
                        <button type="button" onClick={() => handleRemoveAddressRow(idx)} className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground">CEP</label>
                            <input type="text" value={address.cep} onChange={(e) => {
                              const copy = [...addressesForm]; copy[idx].cep = e.target.value; setAddressesForm(copy);
                            }} className="w-full px-2 py-1 text-xs border border-input rounded bg-background text-foreground" required />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground">Rua</label>
                            <input type="text" value={address.rua} onChange={(e) => {
                              const copy = [...addressesForm]; copy[idx].rua = e.target.value; setAddressesForm(copy);
                            }} className="w-full px-2 py-1 text-xs border border-input rounded bg-background text-foreground" required />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground">Número</label>
                            <input type="text" value={address.numero} onChange={(e) => {
                              const copy = [...addressesForm]; copy[idx].numero = e.target.value; setAddressesForm(copy);
                            }} className="w-full px-2 py-1 text-xs border border-input rounded bg-background text-foreground" required />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground">Bairro</label>
                            <input type="text" value={address.bairro} onChange={(e) => {
                              const copy = [...addressesForm]; copy[idx].bairro = e.target.value; setAddressesForm(copy);
                            }} className="w-full px-2 py-1 text-xs border border-input rounded bg-background text-foreground" required />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground">Cidade</label>
                            <input type="text" value={address.cidade} onChange={(e) => {
                              const copy = [...addressesForm]; copy[idx].cidade = e.target.value; setAddressesForm(copy);
                            }} className="w-full px-2 py-1 text-xs border border-input rounded bg-background text-foreground" required />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground">Estado (UF)</label>
                            <input type="text" maxLength={2} value={address.estado} onChange={(e) => {
                              const copy = [...addressesForm]; copy[idx].estado = e.target.value.toUpperCase(); setAddressesForm(copy);
                            }} className="w-full px-2 py-1 text-xs border border-input rounded bg-background text-foreground" required />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground">Complemento</label>
                            <input type="text" value={address.complemento || ''} onChange={(e) => {
                              const copy = [...addressesForm]; copy[idx].complemento = e.target.value; setAddressesForm(copy);
                            }} className="w-full px-2 py-1 text-xs border border-input rounded bg-background text-foreground" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ABA 3: PRODUTOS */}
                {activeModalTab === 'products' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Produtos Anunciados</h4>
                      <button type="button" onClick={handleAddProductRow} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors">
                        <Plus className="h-3 w-3" /> Incluir Produto
                      </button>
                    </div>

                    {productsForm.map((product, idx) => (
                      <div key={idx} className="p-4 border border-border rounded-xl bg-muted/20 relative space-y-3">
                        <button type="button" onClick={() => handleRemoveProductRow(idx)} className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground">Nome do Produto</label>
                            <input type="text" value={product.nome} onChange={(e) => {
                              const copy = [...productsForm]; copy[idx].nome = e.target.value; setProductsForm(copy);
                            }} className="w-full px-2 py-1 text-xs border border-input rounded bg-background text-foreground" required />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground">Preço (R$)</label>
                            <input type="number" step="0.01" value={product.preco} onChange={(e) => {
                              const copy = [...productsForm]; copy[idx].preco = Number(e.target.value); setProductsForm(copy);
                            }} className="w-full px-2 py-1 text-xs border border-input rounded bg-background text-foreground" required />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground">Categoria</label>
                            <select value={product.categoria} onChange={(e) => {
                              const copy = [...productsForm]; copy[idx].categoria = e.target.value; setProductsForm(copy);
                            }} className="w-full px-2 py-1 text-xs border border-input rounded bg-background text-foreground h-[28px] focus:outline-none">
                              {CATEGORIES.map(c => <option key={c.value} value={c.value} className="bg-card text-foreground">{c.label}</option>)}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground">Descrição Curta</label>
                          <textarea rows={2} value={product.descricao} onChange={(e) => {
                            const copy = [...productsForm]; copy[idx].descricao = e.target.value; setProductsForm(copy);
                          }} className="w-full px-2 py-1 text-xs border border-input rounded bg-background text-foreground shrink-0 focus:outline-none" required />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </form>

              {/* Footer Fixo do Modal */}
          <div className="p-4 border-t border-border bg-muted/40 flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="px-4 py-2 text-xs font-semibold border border-input rounded-lg hover:bg-muted text-foreground transition-colors"
              disabled={isEditSubmitting}
            >
              Fechar Sem Salvar
            </button>
            
            {/* Botão de confirmação forçando a paleta azul semântica */}
            <button
              type="button"
              onClick={handleUpdateSubmit}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              disabled={isEditSubmitting}
            >
              {isEditSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
              Sincronizar Alterações
            </button>
          </div>

            </div>
          </div>
        )}

       {/* Modal de Confirmação de Deleção Customizado */}
        {deleteConfirmation && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-card border border-destructive/40 rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              
              {/* Texto principal: 100% visível no tema claro (preto) e escuro (branco) */}
              <h3 className="text-base font-bold text-foreground">
                Excluir Permanentemente?
              </h3>
              
              {/* Mudamos de text-muted-foreground para text-foreground/70 */}
              {/* Isso garante contraste alto em qualquer tema, apenas suavizando a cor base */}
              <p className="text-xs text-foreground/75 mt-2 leading-relaxed">
                Tem certeza que deseja deletar o usuário <strong className="text-foreground font-black underline decoration-destructive/40">"{deleteConfirmation.nome}"</strong>? 
                Esta ação é irreversível e removerá todos os produtos e endereços vinculados em cascata.
              </p>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 px-4 py-2 text-xs font-semibold border border-input bg-background rounded-lg hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2 text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg transition-colors shadow-sm"
                >
                  Sim, Deletar Conta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Flutuante de Notificação Automatizada */}
        {toast && (
          <div className="fixed bottom-4 right-4 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl border border-border shadow-lg bg-card text-foreground animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-sm">
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive shrink-0" />
            )}
            <span className="text-xs font-medium">{toast.message}</span>
          </div>
        )}

      </div>
    </div>
);
}