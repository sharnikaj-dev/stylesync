import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { Product } from '../types/stylesync';

export const AdminConsoleView: React.FC = () => {
  const { notify } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Kurtis');
  const [newBrand, setNewBrand] = useState('');
  const [newColor, setNewColor] = useState('');
  const [myntraPrice, setMyntraPrice] = useState('1499');
  const [flipkartPrice, setFlipkartPrice] = useState('1399');
  const [meeshoPrice, setMeeshoPrice] = useState('1099');

  const loadOverview = async () => {
    try {
      const data = await apiFetch<any>('/api/admin/overview');
      setStats(data.stats);
      setUsers(data.users || []);
      setProducts(data.products || []);
    } catch (err: any) {
      notify(err.message || 'Failed to load admin console.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const toggleRole = async (userId: number, currentRole: string) => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await apiFetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: nextRole }),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u)));
      notify(`Updated user role to ${nextRole}.`, 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const addDemoProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch<{ product: Product }>('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          category: newCategory,
          brand: newBrand,
          color: newColor,
          style: 'Minimalist',
          occasion: 'Casual',
          isDemoData: true,
          listings: [
            {
              platform: 'Myntra',
              currentPrice: Number(myntraPrice) || 1499,
              originalPrice: (Number(myntraPrice) || 1499) + 500,
              discountPercent: 25,
              rating: 4.4,
              reviewCount: 120,
              productUrl: 'https://www.myntra.com',
            },
            {
              platform: 'Flipkart',
              currentPrice: Number(flipkartPrice) || 1399,
              originalPrice: (Number(flipkartPrice) || 1399) + 500,
              discountPercent: 26,
              rating: 4.2,
              reviewCount: 95,
              productUrl: 'https://www.flipkart.com',
            },
            {
              platform: 'Meesho',
              currentPrice: Number(meeshoPrice) || 1099,
              originalPrice: (Number(meeshoPrice) || 1099) + 400,
              discountPercent: 27,
              rating: 3.9,
              reviewCount: 80,
              productUrl: 'https://www.meesho.com',
            },
          ],
        }),
      });
      setProducts((prev) => [res.product, ...prev]);
      setNewName('');
      setNewBrand('');
      setNewColor('');
      notify('Added demonstration product to catalog.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const deleteProduct = async (id: number) => {
    try {
      await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      setProducts((prev) => prev.filter((p) => p.id !== id));
      notify('Deleted product from catalog.', 'info');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium text-[#9D5C63] mb-1">
          Role-Based Administration · PostgreSQL Live Data
        </p>
        <h1 className="font-editorial text-3xl lg:text-4xl font-semibold text-[#1C1917]">
          Platform Administration Console
        </h1>
      </div>

      {/* Usage Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Users', value: stats?.users },
          { label: 'Catalog Products', value: stats?.products },
          { label: 'Wardrobe Items', value: stats?.wardrobeItems },
          { label: 'Saved Outfits', value: stats?.savedOutfits },
          { label: 'Style Analyses', value: stats?.styleAnalyses },
        ].map((m) => (
          <div key={m.label} className="bg-white border border-[#E7E2DA] rounded-xl p-4">
            <div className="text-xs text-[#57534E]">{m.label}</div>
            <div className="font-editorial text-3xl font-semibold text-[#1C1917] mt-1 tabular-nums">
              {loading ? '—' : m.value ?? 0}
            </div>
          </div>
        ))}
      </div>

      {/* Add Catalog Product */}
      <form
        onSubmit={addDemoProduct}
        className="bg-white border border-[#E7E2DA] rounded-xl p-6 space-y-4"
      >
        <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
          Add Demonstration Catalog Product
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Product Name"
            className="px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
          />
          <input
            required
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Category"
            className="px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
          />
          <input
            required
            value={newBrand}
            onChange={(e) => setNewBrand(e.target.value)}
            placeholder="Brand"
            className="px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
          />
          <input
            required
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            placeholder="Color"
            className="px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm"
          />
          <input
            type="number"
            value={myntraPrice}
            onChange={(e) => setMyntraPrice(e.target.value)}
            placeholder="Myntra ₹"
            className="px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm font-mono-num"
          />
          <input
            type="number"
            value={flipkartPrice}
            onChange={(e) => setFlipkartPrice(e.target.value)}
            placeholder="Flipkart ₹"
            className="px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm font-mono-num"
          />
          <input
            type="number"
            value={meeshoPrice}
            onChange={(e) => setMeeshoPrice(e.target.value)}
            placeholder="Meesho ₹"
            className="px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-sm font-mono-num"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1C1917] rounded-lg hover:bg-[#342F2C] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Product
          </button>
        </div>
      </form>

      {/* Users Table */}
      <section className="bg-white border border-[#E7E2DA] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E7E2DA]">
          <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">User Directory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] text-[#57534E] border-b border-[#E7E2DA]">
              <tr>
                <th className="px-6 py-3 font-semibold">User</th>
                <th className="px-6 py-3 font-semibold">Email</th>
                <th className="px-6 py-3 font-semibold">Role</th>
                <th className="px-6 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E2DA]">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-3 font-medium text-[#1C1917]">
                    {u.displayName || 'Unnamed'}
                  </td>
                  <td className="px-6 py-3 text-[#57534E]">{u.email}</td>
                  <td className="px-6 py-3 font-mono-num">{u.role}</td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => toggleRole(u.id, u.role)}
                      className="px-3 py-1 rounded border border-[#E2DBD0] hover:bg-[#F2EDE6] cursor-pointer"
                    >
                      Switch to {u.role === 'admin' ? 'user' : 'admin'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Catalog Management */}
      <section className="bg-white border border-[#E7E2DA] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E7E2DA]">
          <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
            Catalog Products ({products.length})
          </h2>
        </div>
        <div className="divide-y divide-[#E7E2DA]">
          {products.map((p) => (
            <div key={p.id} className="px-6 py-3 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-[#1C1917]">{p.name}</span>
                <span className="text-[#57534E] ml-2">
                  {p.brand} · {p.category} · {p.color}
                </span>
              </div>
              <button
                onClick={() => deleteProduct(p.id)}
                className="p-1.5 text-[#8B2E2E] hover:bg-[#FDF2F2] rounded cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
