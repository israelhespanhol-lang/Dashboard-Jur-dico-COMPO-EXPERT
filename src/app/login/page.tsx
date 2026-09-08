"use client";

import { useState } from "react";
import { ArrowRight, Lock, ShieldCheck, Mail } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Gravar um cookie provisório de 1 dia para liberar o acesso no middleware
    document.cookie = "compo_auth=true; path=/; max-age=86400";
    // Simular carregamento e redirecionar
    setTimeout(() => {
      window.location.href = "/";
    }, 1200);
  };

  return (
    <div className="login-wrapper">
      <div className="login-cover">
        <div className="login-cover-content">
          <div style={{ textAlign: 'center', width: '100%', marginBottom: '60px' }}>
            <img 
              src="/compo-expert-logo.svg" 
              alt="COMPO EXPERT Logo" 
              style={{ height: '140px', filter: 'brightness(0) invert(1)', display: 'inline-block' }} 
            />
          </div>
          <h1>
            Inteligência e controle para o seu <span>Radar Jurídico</span>
          </h1>
          <p>
            Monitore, rastreie e atualize automaticamente todo o seu portfólio de processos
            com precisão em tempo real. Integração direta com DataJud e DJEN.
          </p>
          
          <div className="login-glass-card">
            <div className="login-glass-icon">
              <ShieldCheck size={24} strokeWidth={2.5} />
            </div>
            <div>
              <strong>Segurança de dados governamental</strong>
              <p>As informações transitam de forma segura através das APIs públicas do CNJ, com criptografia de ponta a ponta e auditoria completa.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="login-form-area">
        <div className="login-logo">
          <img src="/compo-expert-logo.svg" alt="COMPO EXPERT Logo" />
        </div>
        
        <h2>Acesso ao Painel</h2>
        <p className="subtitle">Entre com suas credenciais corporativas</p>
        
        <form onSubmit={handleLogin}>
          <div className="login-field">
            <label htmlFor="email">E-mail corporativo</label>
            <div style={{ position: "relative" }}>
              <Mail size={18} color="#a9b5af" style={{ position: "absolute", left: "14px", top: "15px" }} />
              <input 
                id="email" 
                type="email" 
                placeholder="nome@compo-expert.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: "42px" }}
                required 
              />
            </div>
          </div>
          
          <div className="login-field">
            <label htmlFor="password">Senha</label>
            <div style={{ position: "relative" }}>
              <Lock size={18} color="#a9b5af" style={{ position: "absolute", left: "14px", top: "15px" }} />
              <input 
                id="password" 
                type="password" 
                placeholder="••••••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: "42px" }}
                required 
              />
            </div>
          </div>
          
          <div className="login-options">
            <label>
              <input type="checkbox" defaultChecked /> Manter conectado
            </label>
            <a href="#">Esqueceu a senha?</a>
          </div>
          
          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? "Autenticando..." : "Entrar no sistema"} 
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>
        
        <div className="login-footer">
          <p>© {new Date().getFullYear()} COMPO EXPERT. Uso restrito e confidencial.</p>
        </div>
      </div>
    </div>
  );
}
