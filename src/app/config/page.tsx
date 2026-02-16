"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
// ADICIONEI O 'Send' ABAIXO:
import { Save, Lock, ArrowLeft, CheckCircle2, HelpCircle, Send } from "lucide-react";
import Link from "next/link";const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function ConfigSettings() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ meta_access_token: "", meta_ad_account_id: "", telegram_chat_id: "" });

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single();
        if (data) setForm({ 
            meta_access_token: data.meta_access_token || "", 
            meta_ad_account_id: data.meta_ad_account_id || "", 
            telegram_chat_id: data.telegram_chat_id || "" 
        });
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Sessão expirada. Faça login novamente.");

    const { error } = await supabase.from("user_settings").upsert({ 
      user_id: user.id, 
      ...form,
      updated_at: new Date()
    });

    if (!error) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else { alert("Erro: " + error.message); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans flex flex-col items-center">
      <header className="w-full max-w-2xl flex justify-between items-center mb-12">
        <Link href="/pulse" className="text-gray-500 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
          <ArrowLeft size={14} /> Voltar
        </Link>
        <h1 className="text-2xl font-black italic uppercase tracking-tighter">CONFIGURAÇÕES<span className="text-purple-600">.</span></h1>
      </header>

      <div className="w-full max-w-2xl space-y-6">
        <div className="bg-[#0A0A0A] border border-white/5 p-8 rounded-[40px]">
          <h2 className="text-[10px] font-black text-gray-500 uppercase mb-6 tracking-widest flex items-center gap-2"><Lock size={12}/> Meta Ads API</h2>
          <div className="space-y-4">
            <input type="password" placeholder="Access Token (EAA...)" value={form.meta_access_token} onChange={e => setForm({...form, meta_access_token: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-2xl focus:border-purple-600 outline-none transition-all text-sm font-mono" />
            <input type="text" placeholder="Ad Account ID (act_...)" value={form.meta_ad_account_id} onChange={e => setForm({...form, meta_ad_account_id: e.target.value})} className="w-full bg-black border border-white/10 p-4 rounded-2xl focus:border-purple-600 outline-none transition-all text-sm font-mono" />
          </div>
        </div>

        <div className="bg-[#0A0A0A] border border-white/5 p-8 rounded-[40px]">
          <h2 className="text-[10px] font-black text-gray-500 uppercase mb-6 tracking-widest flex items-center gap-2"><Send size={12}/> Notificações</h2>
          <div className="flex gap-4">
            <input type="text" placeholder="Seu Telegram Chat ID" value={form.telegram_chat_id} onChange={e => setForm({...form, telegram_chat_id: e.target.value})} className="flex-1 bg-black border border-white/10 p-4 rounded-2xl focus:border-purple-600 outline-none transition-all text-sm font-mono" />
            <a href="https://t.me/userinfobot" target="_blank" className="p-4 bg-white/5 border border-white/10 rounded-2xl text-gray-500 hover:text-white transition-all"><HelpCircle size={20}/></a>
          </div>
        </div>

        <button onClick={handleSave} disabled={loading} className={`w-full p-5 rounded-2xl font-black uppercase italic transition-all flex items-center justify-center gap-2 ${success ? 'bg-green-600 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-purple-600 hover:bg-purple-500'}`}>
          {loading ? "Salvando..." : success ? <><CheckCircle2 size={18}/> Salvo!</> : <><Save size={18}/> Aplicar Alterações</>}
        </button>
      </div>
    </div>
  );
}