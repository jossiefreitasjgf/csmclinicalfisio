import React, { useState, useEffect } from 'react';
import { 
  Check, 
  MessageSquare, 
  Smartphone, 
  Settings, 
  AlertCircle, 
  Database, 
  FileText, 
  Wifi, 
  WifiOff, 
  Send,
  Webhook,
  Zap,
  Terminal,
  CheckCircle,
  Code,
  Globe,
  Calendar,
  UserCheck,
  Copy,
  RefreshCw
} from 'lucide-react';
import { Clinic } from '../types';

interface CommunicationSettingsProps {
  currentClinic: Clinic;
  onUpdateClinicDetails: (id: string, details: Partial<Clinic>) => void;
  darkMode: boolean;
}

export default function CommunicationSettings({
  currentClinic,
  onUpdateClinicDetails,
  darkMode
}: CommunicationSettingsProps) {
  // WhatsApp State Management
  const [whatsappNumber, setWhatsappNumber] = useState(currentClinic.whatsapp || '');
  const [isWhatsappConnected, setIsWhatsappConnected] = useState(!!currentClinic.whatsapp);

  // Enhanced WhatsApp pairing simulator state
  const [whatsappState, setWhatsappState] = useState<'disconnected' | 'connecting' | 'waiting_qr' | 'pairing' | 'connected'>(
    currentClinic.whatsapp ? 'connected' : 'disconnected'
  );
  const [qrCountdown, setQrCountdown] = useState(20);
  const [qrString, setQrString] = useState('');
  const [qrRegenCount, setQrRegenCount] = useState(0);
  const [whatsappLogs, setWhatsappLogs] = useState<string[]>([]);
  const [isConfiguringManualApi, setIsConfiguringManualApi] = useState(false);
  const [whatsappApiUrl, setWhatsappApiUrl] = useState(currentClinic.whatsappApiUrl || '');
  const [whatsappApiToken, setWhatsappApiToken] = useState(currentClinic.whatsappApiToken || '');
  const [whatsappApiInstance, setWhatsappApiInstance] = useState(currentClinic.whatsappApiInstance || '');
  const [messageTemplate, setMessageTemplate] = useState(
    "Olá [Responsável]! 🎈 Passando para lembrar que a sessão de terapia de [Paciente] está marcada para [Data] às [Hora] na clínica [Clínica]. Contamos com vocês!"
  );

  // Webhook and Automations state
  const [webhookProvider, setWebhookProvider] = useState<'whatsapp_web' | 'twilio' | 'custom'>(
    currentClinic.webhookProvider || 'whatsapp_web'
  );
  const [webhookUrl, setWebhookUrl] = useState(currentClinic.webhookUrl || '');
  const [webhookSecret, setWebhookSecret] = useState(currentClinic.webhookSecret || '');
  const [webhookToken, setWebhookToken] = useState(currentClinic.webhookToken || '');
  
  const [triggerReminders, setTriggerReminders] = useState(
    currentClinic.webhookTriggers?.appointmentReminders !== false
  );
  const [triggerConfirmations, setTriggerConfirmations] = useState(
    currentClinic.webhookTriggers?.registrationConfirmations !== false
  );

  const [reminderTemplate, setReminderTemplate] = useState(
    currentClinic.reminderTemplate || 
    "Olá [Responsável]! 📅 Passando para confirmar a consulta de Fisioterapia de [Paciente] agendada para [Data] às [Hora] no consultório [Clínica]. Por favor, responda 'SIM' para confirmar a presença ou 'NÃO' para remarcar."
  );

  const [confirmationTemplate, setConfirmationTemplate] = useState(
    currentClinic.confirmationTemplate || 
    "Parabéns [Responsável]! 🎉 A matrícula de [Paciente] no evento/grupo terapêutico '[Evento]' foi confirmada com sucesso em nossa clínica [Clínica]. Estamos ansiosos para começar!"
  );

  // Webhook Test Simulation states
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [testPayload, setTestPayload] = useState<string>('');
  const [selectedTestTrigger, setSelectedTestTrigger] = useState<'reminder' | 'confirmation'>('reminder');

  // Sync edit inputs when active clinic changes
  useEffect(() => {
    setWhatsappNumber(currentClinic.whatsapp || '');
    setIsWhatsappConnected(!!currentClinic.whatsapp);
    setWhatsappApiUrl(currentClinic.whatsappApiUrl || '');
    setWhatsappApiToken(currentClinic.whatsappApiToken || '');
    setWhatsappApiInstance(currentClinic.whatsappApiInstance || '');
    setWhatsappState(currentClinic.whatsapp ? 'connected' : 'disconnected');
    
    // Sync Webhook states
    setWebhookProvider(currentClinic.webhookProvider || 'whatsapp_web');
    setWebhookUrl(currentClinic.webhookUrl || '');
    setWebhookSecret(currentClinic.webhookSecret || '');
    setWebhookToken(currentClinic.webhookToken || '');
    setTriggerReminders(currentClinic.webhookTriggers?.appointmentReminders !== false);
    setTriggerConfirmations(currentClinic.webhookTriggers?.registrationConfirmations !== false);
    setReminderTemplate(
      currentClinic.reminderTemplate || 
      "Olá [Responsável]! 📅 Passando para confirmar a consulta de Fisioterapia de [Paciente] agendada para [Data] às [Hora] no consultório [Clínica]. Por favor, responda 'SIM' para confirmar a presença ou 'NÃO' para remarcar."
    );
    setConfirmationTemplate(
      currentClinic.confirmationTemplate || 
      "Parabéns [Responsável]! 🎉 A matrícula de [Paciente] no evento/grupo terapêutico '[Evento]' foi confirmada com sucesso em nossa clínica [Clínica]. Estamos ansiosos para começar!"
    );

    if (currentClinic.whatsapp) {
      localStorage.setItem('csm_whatsapp_linked', currentClinic.whatsapp);
    } else {
      localStorage.removeItem('csm_whatsapp_linked');
    }
  }, [currentClinic]);

  // Effect to manage QR countdown and logs for realistic simulation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (whatsappState === 'waiting_qr') {
      if (qrCountdown > 0) {
        timer = setTimeout(() => setQrCountdown(prev => prev - 1), 1000);
      } else {
        // Regenerate QR code
        setQrCountdown(20);
        setQrRegenCount(prev => prev + 1);
        setQrString(`1@csm-cl-ws-session-${currentClinic.id}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`);
        setWhatsappLogs(prev => [
          `[${new Date().toLocaleTimeString()}] ⚠️ QR Code anterior expirado. Renovando token de pareamento...`,
          `[${new Date().toLocaleTimeString()}] 🔄 Novo código QR gerado e transmitido via WebSocket (Token: MD-${Math.floor(Math.random() * 9000 + 1000)})`,
          ...prev.slice(0, 8)
        ]);
      }
    }
    return () => clearTimeout(timer);
  }, [whatsappState, qrCountdown, currentClinic.id]);

  const handleStartWhatsappConnection = () => {
    if (!whatsappNumber) return;
    setWhatsappState('connecting');
    setWhatsappLogs([
      `[${new Date().toLocaleTimeString()}] 🔌 Iniciando conexão WebSocket com servidor de mensagens...`,
      `[${new Date().toLocaleTimeString()}] 📡 Estabelecendo handshake seguro (SSL/TLS)...`,
      `[${new Date().toLocaleTimeString()}] 🔐 Gerando par de chaves Curve25519 para criptografia ponta-a-ponta...`
    ]);

    setTimeout(() => {
      setWhatsappState('waiting_qr');
      setQrCountdown(20);
      setQrString(`2@csm-cl-ws-session-${currentClinic.id}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`);
      setWhatsappLogs(prev => [
        `[${new Date().toLocaleTimeString()}] 📲 Chaves geradas. Aguardando leitura do QR Code pelo WhatsApp...`,
        `[${new Date().toLocaleTimeString()}] 🔄 Transmitindo QR Code de Pareamento (Canal Ativo)...`,
        ...prev
      ]);
    }, 1500);
  };

  const handleSimulatePairing = () => {
    setWhatsappState('pairing');
    setWhatsappLogs(prev => [
      `[${new Date().toLocaleTimeString()}] 📱 Câmera detectou o QR Code! Iniciando leitura...`,
      `[${new Date().toLocaleTimeString()}] 👤 Autenticando com dispositivo ${whatsappNumber}...`,
      `[${new Date().toLocaleTimeString()}] 🔑 Chave de pareamento aceita! Sincronizando dados básicos de perfil...`,
      ...prev
    ]);

    setTimeout(() => {
      onUpdateClinicDetails(currentClinic.id, { whatsapp: whatsappNumber });
      localStorage.setItem('csm_whatsapp_linked', whatsappNumber);
      setIsWhatsappConnected(true);
      setWhatsappState('connected');
      setWhatsappLogs(prev => [
        `[${new Date().toLocaleTimeString()}] ✅ Pareamento concluído com sucesso!`,
        `[${new Date().toLocaleTimeString()}] 🟢 Dispositivo conectado e operando no CSM Clinical.`,
        ...prev
      ]);
    }, 2000);
  };

  const handleSaveManualApiConfig = () => {
    onUpdateClinicDetails(currentClinic.id, {
      whatsapp: whatsappNumber,
      whatsappApiUrl,
      whatsappApiToken,
      whatsappApiInstance
    });
    localStorage.setItem('csm_whatsapp_linked', whatsappNumber);
    setIsWhatsappConnected(true);
    setWhatsappState('connected');
    alert("Configurações de API de Produção salvas com sucesso! Integração ativa.");
  };

  const handleSaveWebhookConfig = () => {
    onUpdateClinicDetails(currentClinic.id, {
      webhookProvider,
      webhookUrl,
      webhookSecret,
      webhookToken,
      webhookTriggers: {
        appointmentReminders: triggerReminders,
        registrationConfirmations: triggerConfirmations
      },
      reminderTemplate,
      confirmationTemplate
    });
    alert("Integrações e regras de Webhook salvas com sucesso no consultório!");
  };

  const handleSimulateTestWebhook = () => {
    if (!webhookUrl) {
      alert("Por favor, configure uma URL de Webhook para realizar o teste de envio.");
      return;
    }

    setIsTestingWebhook(true);
    setTestLogs([
      `[${new Date().toLocaleTimeString()}] 🚀 Iniciando simulação de disparo de Webhook...`,
      `[${new Date().toLocaleTimeString()}] 🔌 Verificando endpoint de comunicação para ${webhookProvider.toUpperCase()}...`,
    ]);

    // Prepare dynamic payload based on trigger selected
    let payload = {};
    if (selectedTestTrigger === 'reminder') {
      payload = {
        event: "appointment.reminder",
        timestamp: new Date().toISOString(),
        clinicId: currentClinic.id,
        clinicName: currentClinic.name,
        recipient: {
          phone: "+5511983112244",
          name: "Maria Silva (Mãe)"
        },
        patient: {
          id: "pat-9023",
          name: "Enzo Silva"
        },
        appointment: {
          date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
          time: "14:30",
          specialty: "Integração Sensorial"
        },
        messageText: reminderTemplate
          .replace('[Responsável]', 'Maria Silva')
          .replace('[Paciente]', 'Enzo Silva')
          .replace('[Data]', new Date(Date.now() + 86400000).toLocaleDateString('pt-BR'))
          .replace('[Hora]', '14:30')
          .replace('[Clínica]', currentClinic.name)
      };
    } else {
      payload = {
        event: "registration.confirmation",
        timestamp: new Date().toISOString(),
        clinicId: currentClinic.id,
        clinicName: currentClinic.name,
        recipient: {
          phone: "+5511983112244",
          name: "Maria Silva (Mãe)"
        },
        patient: {
          id: "pat-9023",
          name: "Enzo Silva"
        },
        registration: {
          id: "reg-101",
          number: "CSM-7629",
          eventName: "Circuito de Estimulação Motora"
        },
        messageText: confirmationTemplate
          .replace('[Responsável]', 'Maria Silva')
          .replace('[Paciente]', 'Enzo Silva')
          .replace('[Evento]', 'Circuito de Estimulação Motora')
          .replace('[Clínica]', currentClinic.name)
      };
    }

    setTestPayload(JSON.stringify(payload, null, 2));

    setTimeout(() => {
      setTestLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 📝 Payload JSON de teste estruturado com sucesso.`,
        `[${new Date().toLocaleTimeString()}] 🔑 Chave de Segurança: ${webhookSecret ? 'HMAC-SHA256 assinado usando o Segredo configurado' : 'Sem chave de assinatura configurada (Inseguro)'}`,
      ]);
    }, 800);

    setTimeout(() => {
      setTestLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 📡 Transmitindo via POST request para ${webhookUrl}...`,
        `[${new Date().toLocaleTimeString()}] 🔐 Header de Autorização: ${webhookToken ? 'Bearer Token transmitido' : 'Sem Token de Autorização'}`
      ]);
    }, 1600);

    setTimeout(() => {
      setIsTestingWebhook(false);
      setTestLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 📥 Resposta recebida: HTTP 200 OK (Solicitação Aceita)!`,
        `[${new Date().toLocaleTimeString()}] ✅ Simulação de envio finalizada. O evento disparou o envio da mensagem de texto de teste com sucesso para o paciente!`
      ]);
    }, 2800);
  };

  return (
    <div id="communication-settings-module" className="space-y-8 pb-16 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#8A9F94] bg-[#9BB0A5]/10 dark:bg-[#9BB0A5]/5 px-3 py-1.5 rounded-full">
            📡 Módulo de Comunicação
          </span>
          <h2 className="text-xl font-serif italic font-semibold text-[#2D312E] dark:text-white mt-3">
            Modos de Comunicação & Disparos
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Gerencie os canais de envio de lembretes de agenda, tarefas terapêuticas de casa e mensagens de confirmação de presença diretamente para o celular dos pacientes ou responsáveis.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT SIDE: Information and channel health */}
        <div className="lg:col-span-4 space-y-6">
          <div className={`p-6 border rounded-[2rem] shadow-sm space-y-4 ${
            darkMode ? 'bg-[#242D28] border-[#2E3832] text-[#ECEBE5]' : 'bg-white border-[#E5E3DB] text-[#2D312E]'
          }`}>
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#8A9F94] flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-500" />
              Canais Disponíveis
            </h3>
            
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">WhatsApp API</h4>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Disponível no Plano</p>
                  </div>
                </div>
                {isWhatsappConnected ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <Wifi className="w-3.5 h-3.5 animate-pulse" /> Ativo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <WifiOff className="w-3.5 h-3.5" /> Inativo
                  </span>
                )}
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 opacity-60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">E-mail Transacional</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Não configurado</p>
                  </div>
                </div>
                <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md font-extrabold text-slate-400">EM BREVE</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E5E3DB] dark:border-[#2E3832] space-y-2">
              <p className="text-[11px] leading-relaxed text-slate-400">
                ⚠️ Os envios de mensagens utilizam tags inteligentes dinâmicas que preenchem as informações de consultas agendadas em tempo real.
              </p>
            </div>
          </div>

          {/* Quick tips */}
          <div className={`p-6 border rounded-[2rem] shadow-sm space-y-3 ${
            darkMode ? 'bg-[#242D28] border-[#2E3832]' : 'bg-[#F9F8F3] border-[#E5E3DB]'
          }`}>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#8A9F94] flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" /> Dicas de Formatação
            </h4>
            <ul className="text-[11px] text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
              <li>Use <strong>[Responsável]</strong> para citar o nome de quem acompanha o paciente.</li>
              <li>Use <strong>[Paciente]</strong> para citar o nome da pessoa atendida.</li>
              <li>Use <strong>[Data]</strong> e <strong>[Hora]</strong> para preencher data e horário da consulta.</li>
              <li>Use <strong>[Clínica]</strong> para citar o nome corporativo configurado.</li>
            </ul>
          </div>
        </div>

        {/* RIGHT SIDE: Dedicated Whatsapp config panel */}
        <div className="lg:col-span-8 space-y-6">
          <div className={`p-6 border rounded-[2rem] shadow-sm space-y-5 ${
            darkMode ? 'bg-[#242D28] border-[#2E3832] text-[#ECEBE5]' : 'bg-white border-[#E5E3DB] text-[#2D312E]'
          }`}>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E5E3DB] dark:border-[#2E3832]">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full">
                  💬 Integração WhatsApp Multi-Device
                </span>
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#8A9F94] mt-2 mb-0.5">
                  Conexão de Disparo Clínico
                </h3>
                <p className="text-[11px] text-slate-400">
                  Ligue um aparelho celular para disparar as tarefas de casa e as notificações de agendamento de forma automatizada.
                </p>
              </div>

              {!isWhatsappConnected && (
                <div className="flex bg-[#F9F8F3] dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start">
                  <button
                    type="button"
                    onClick={() => setIsConfiguringManualApi(false)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                      !isConfiguringManualApi 
                        ? 'bg-[#9BB0A5] text-white shadow-xs' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Simulador Web
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfiguringManualApi(true)}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                      isConfiguringManualApi 
                        ? 'bg-[#9BB0A5] text-white shadow-xs' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    API de Produção
                  </button>
                </div>
              )}
            </div>

            {isWhatsappConnected ? (
              <div className="space-y-4 animate-in fade-in duration-250">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                        <Check className="w-5 h-5" />
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#242D28] animate-ping"></span>
                    </div>
                    <div>
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">Instância WhatsApp Ativa e Conectada</p>
                      <p className="text-[10px] font-mono font-bold text-slate-500 mt-0.5">Dispositivo: +55 {whatsappNumber}</p>
                      {currentClinic.whatsappApiUrl && (
                        <p className="text-[9px] font-semibold text-[#8A9F94] mt-0.5">Modo de Produção: Gateway Ativo ({currentClinic.whatsappApiInstance})</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onUpdateClinicDetails(currentClinic.id, { 
                        whatsapp: '',
                        whatsappApiUrl: '',
                        whatsappApiToken: '',
                        whatsappApiInstance: ''
                      });
                      localStorage.removeItem('csm_whatsapp_linked');
                      setIsWhatsappConnected(false);
                      setWhatsappNumber('');
                      setWhatsappState('disconnected');
                      setWhatsappLogs([]);
                    }}
                    className="px-3.5 py-1.5 text-[10px] font-bold rounded-xl bg-rose-500 hover:bg-rose-600 text-white transition-all cursor-pointer shadow-xs self-end sm:self-auto"
                  >
                    Desconectar Aparelho
                  </button>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Modelo do Texto de Confirmação</label>
                  <textarea
                    rows={4}
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    className={`w-full text-xs font-semibold rounded-xl px-4 py-3 outline-none border transition-all ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-[#E5E3DB] text-slate-800'
                    }`}
                  />
                  <span className="text-[9px] text-slate-400 italic block">Tags dinâmicas automáticas: [Responsável], [Paciente], [Data], [Hora] e [Clínica].</span>
                </div>
              </div>
            ) : isConfiguringManualApi ? (
              // PRODUCTION API CARD
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Aviso de Integração:</strong> Para conexões reais em ambiente de produção, configure as credenciais do seu gateway de mensagens contratado (Z-API, Evolution API, ou Baileys corporativo).
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Celular da Instância (com DDD)</label>
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="Ex: (11) 98311-2244"
                      className={`w-full text-xs font-semibold rounded-xl px-4 py-2.5 outline-none border transition-all ${
                        darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#F9F8F3] border-[#E5E3DB] text-slate-800'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nome / ID da Instância</label>
                    <input
                      type="text"
                      value={whatsappApiInstance}
                      onChange={(e) => setWhatsappApiInstance(e.target.value)}
                      placeholder="Ex: csm_clinica_principal"
                      className={`w-full text-xs font-semibold rounded-xl px-4 py-2.5 outline-none border transition-all ${
                        darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#F9F8F3] border-[#E5E3DB] text-slate-800'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">URL do Endpoint do Gateway</label>
                    <input
                      type="text"
                      value={whatsappApiUrl}
                      onChange={(e) => setWhatsappApiUrl(e.target.value)}
                      placeholder="Ex: https://api.meugateway.com.br/v1/instance"
                      className={`w-full text-xs font-semibold rounded-xl px-4 py-2.5 outline-none border transition-all ${
                        darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#F9F8F3] border-[#E5E3DB] text-slate-800'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Token Secreto da Instância (API Key)</label>
                    <input
                      type="password"
                      value={whatsappApiToken}
                      onChange={(e) => setWhatsappApiToken(e.target.value)}
                      placeholder="••••••••••••••••••••••••••••••••"
                      className={`w-full text-xs font-mono font-bold rounded-xl px-4 py-2.5 outline-none border transition-all ${
                        darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#F9F8F3] border-[#E5E3DB] text-slate-800'
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveManualApiConfig}
                  disabled={!whatsappNumber || !whatsappApiUrl}
                  className="w-full py-2.5 bg-[#9BB0A5] hover:bg-[#8A9F94] disabled:bg-slate-350 dark:disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  ✓ Conectar e Salvar Instância de Produção
                </button>
              </div>
            ) : (
              // INTERACTIVE WEBSOCKET SCANNER SIMULATOR
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Insira o Celular com DDD (WhatsApp)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-xs font-bold font-mono">
                      🇧🇷 +55
                    </span>
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="(11) 98311-2244"
                      disabled={whatsappState !== 'disconnected'}
                      className={`w-full text-xs font-bold rounded-xl pl-14 pr-4 py-3 outline-none border transition-all ${
                        darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-[#F9F8F3] border-[#E5E3DB] text-slate-800'
                      } ${whatsappState !== 'disconnected' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                </div>

                {whatsappNumber ? (
                  <div className="space-y-4">
                    {whatsappState === 'disconnected' && (
                      <div className="p-5 border rounded-2xl border-[#E5E3DB] dark:border-slate-800/85 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center text-center gap-3 animate-in fade-in">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                          <Check className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Pronto para Conectar o Dispositivo</p>
                          <p className="text-[10px] text-slate-400 max-w-xs mt-1">
                            Para gerar um QR Code de pareamento criptográfico em tempo real, clique no botão abaixo.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleStartWhatsappConnection}
                          className="px-5 py-2.5 bg-[#9BB0A5] hover:bg-[#8A9F94] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs w-full"
                        >
                          🔄 Gerar QR Code de Pareamento Seguro
                        </button>
                      </div>
                    )}

                    {whatsappState === 'connecting' && (
                      <div className="p-8 border rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center text-center gap-4 animate-in zoom-in-95 duration-250">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-[#9BB0A5] border-b-slate-300"></div>
                        <div>
                          <p className="text-xs font-bold text-[#9BB0A5]">Iniciando Servidor de Sessões...</p>
                          <p className="text-[9px] font-mono text-slate-400 mt-1">Conectando ao gateway e assinando canais WebSocket de comunicação segura.</p>
                        </div>
                      </div>
                    )}

                    {whatsappState === 'waiting_qr' && (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-4 border rounded-2xl border-[#E5E3DB] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 animate-in fade-in duration-300">
                        {/* QR Box */}
                        <div className="md:col-span-5 flex flex-col items-center justify-center gap-2">
                          <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-100 flex items-center justify-center relative overflow-hidden">
                            <div className="w-40 h-40 relative flex items-center justify-center bg-white rounded-xl">
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrString)}`}
                                alt="WhatsApp Web Connection Pairing QR"
                                className="w-36 h-36 object-contain"
                                referrerPolicy="no-referrer"
                              />
                              {/* Laser scan line overlay */}
                              <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 animate-[bounce_2.5s_infinite] shadow-md opacity-80 pointer-events-none"></div>
                            </div>
                          </div>
                          
                          {/* Timer */}
                          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/15 px-3 py-1 rounded-full text-[9px] text-amber-600 dark:text-amber-400 font-bold">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
                            Código expira em {qrCountdown}s
                          </div>
                        </div>

                        {/* Scanner guidelines & interactive pairing emulator */}
                        <div className="md:col-span-7 flex flex-col justify-between gap-4">
                          <div className="space-y-2">
                            <h4 className="text-xs font-black text-slate-700 dark:text-slate-100 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-[#9BB0A5]"></span>
                              Como Parear o Dispositivo:
                            </h4>
                            <ol className="list-decimal list-inside text-[10px] text-slate-400 space-y-1 font-semibold leading-relaxed">
                              <li>Abra o WhatsApp no seu smartphone.</li>
                              <li>Acesse Configurações &gt; Aparelhos Conectados.</li>
                              <li>Toque em <strong className="text-slate-600 dark:text-slate-350">Conectar um Aparelho</strong>.</li>
                              <li>Aponte a câmera para ler o QR Code dinâmico gerado.</li>
                            </ol>
                            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-[9px] text-slate-400 leading-normal">
                              💡 <strong>Nota de Teste:</strong> No ambiente de simulação sandbox, clique no botão azul abaixo para simular a leitura do QR code com sucesso!
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleSimulatePairing}
                            className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md w-full"
                          >
                            📱 Simular Leitura do QR Code com o Celular
                          </button>
                        </div>

                        {/* Real-time WebSocket simulator logs block */}
                        <div className="md:col-span-12 space-y-1.5">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Console de Transmissão WebSocket (Live Logs):
                          </p>
                          <div className="bg-slate-900 text-[#00FF66] font-mono p-3 rounded-xl border border-slate-800 text-[10px] max-h-24 overflow-y-auto leading-relaxed shadow-inner">
                            {whatsappLogs.map((log, index) => (
                              <div key={index} className="truncate">{log}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {whatsappState === 'pairing' && (
                      <div className="p-8 border rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center text-center gap-3 animate-in zoom-in-95">
                        <div className="animate-bounce p-3 bg-emerald-500/10 text-emerald-500 rounded-full">
                          <Check className="w-8 h-8 animate-pulse" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Verificando Credenciais do Aparelho...</p>
                          <p className="text-[9px] font-mono text-slate-400 mt-1">
                            Estabelecendo conexão persistente com o WhatsApp e assinando Webhooks.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-center text-[10px] text-slate-400 font-semibold italic">
                    Digite o número de telefone acima para exibir o QR Code de Vinculação.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FULL SPAN: Webhook & Automations Integration Panel */}
        <div className="lg:col-span-12 space-y-6 mt-4">
          <div className={`p-6 border rounded-[2rem] shadow-sm space-y-6 ${
            darkMode ? 'bg-[#242D28] border-[#2E3832] text-[#ECEBE5]' : 'bg-white border-[#E5E3DB] text-[#2D312E]'
          }`}>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E3DB] dark:border-[#2E3832]">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-1 bg-[#9BB0A5]/10 text-[#8A9F94] rounded-full flex items-center gap-1.5 w-max">
                  <Webhook className="w-3.5 h-3.5 text-[#8A9F94]" /> Webhooks & Automação de Disparos
                </span>
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-[#8A9F94] mt-2 mb-0.5">
                  Integração Externa de Mensagens (WhatsApp / Twilio)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Configure eventos em lote para enviar lembretes automáticos e mensagens de confirmação de matrículas usando gatilhos Webhook.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Webhook Configuration fields */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-[#9BB0A5]" /> Configuração do Gateway
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Provedor de Serviço</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setWebhookProvider('whatsapp_web')}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          webhookProvider === 'whatsapp_web'
                            ? 'bg-[#9BB0A5] text-white border-transparent'
                            : darkMode
                              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        WhatsApp Web
                      </button>
                      <button
                        type="button"
                        onClick={() => setWebhookProvider('twilio')}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          webhookProvider === 'twilio'
                            ? 'bg-[#9BB0A5] text-white border-transparent'
                            : darkMode
                              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        Twilio API
                      </button>
                      <button
                        type="button"
                        onClick={() => setWebhookProvider('custom')}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          webhookProvider === 'custom'
                            ? 'bg-[#9BB0A5] text-white border-transparent'
                            : darkMode
                              ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        Custom URL
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">URL do Webhook (Endpoint Receptor)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center">
                        <Globe className="w-4 h-4 text-slate-400" />
                      </span>
                      <input
                        type="text"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="Ex: https://meuservico.com/webhooks/csm-clinical"
                        className={`w-full text-xs font-semibold rounded-xl pl-10 pr-4 py-2.5 outline-none border transition-all ${
                          darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Token de Autorização (Bearer)</label>
                    <input
                      type="password"
                      value={webhookToken}
                      onChange={(e) => setWebhookToken(e.target.value)}
                      placeholder="Insira o Token"
                      className={`w-full text-xs font-mono font-bold rounded-xl px-4 py-2.5 outline-none border transition-all ${
                        darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Segredo para Assinatura (Secret Key)</label>
                    <input
                      type="password"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      placeholder="Insira a chave secreta"
                      className={`w-full text-xs font-mono font-bold rounded-xl px-4 py-2.5 outline-none border transition-all ${
                        darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>

                {/* Automation triggers config */}
                <div className="space-y-3 pt-4 border-t border-[#E5E3DB] dark:border-[#2E3832]">
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" /> Gatilhos de Envio Automático
                  </h4>

                  <div className="space-y-2">
                    <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 cursor-pointer hover:bg-slate-100/30 transition-all">
                      <input
                        type="checkbox"
                        checked={triggerReminders}
                        onChange={(e) => setTriggerReminders(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">Lembretes de Consultas (24h antes)</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Envia automaticamente uma mensagem de confirmação para o WhatsApp ou celular do responsável 24 horas antes do atendimento clínico.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 cursor-pointer hover:bg-slate-100/30 transition-all">
                      <input
                        type="checkbox"
                        checked={triggerConfirmations}
                        onChange={(e) => setTriggerConfirmations(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">Confirmação de Matrícula em Eventos</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Envia de forma imediata uma notificação de sucesso quando a criança é inscrita e o pagamento é validado no sistema.</span>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveWebhookConfig}
                  className="w-full py-2.5 bg-[#9BB0A5] hover:bg-[#8A9F94] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  ✓ Salvar Integração e Configurações de Gatilhos
                </button>
              </div>

              {/* Template Customizer & Live Test Console */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-500" /> Textos de Disparo Automático
                </h4>

                <div className="space-y-3">
                  {triggerReminders && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Modelo: Lembrete de Consulta</label>
                        <span className="text-[9px] text-[#8A9F94] font-bold">24 horas antes</span>
                      </div>
                      <textarea
                        rows={3}
                        value={reminderTemplate}
                        onChange={(e) => setReminderTemplate(e.target.value)}
                        className={`w-full text-xs font-semibold rounded-xl px-4 py-2.5 outline-none border transition-all ${
                          darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                  )}

                  {triggerConfirmations && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Modelo: Confirmação de Matrícula</label>
                        <span className="text-[9px] text-indigo-500 font-bold">Instante da Matrícula</span>
                      </div>
                      <textarea
                        rows={3}
                        value={confirmationTemplate}
                        onChange={(e) => setConfirmationTemplate(e.target.value)}
                        className={`w-full text-xs font-semibold rounded-xl px-4 py-2.5 outline-none border transition-all ${
                          darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                  )}

                  <div className="p-2 bg-slate-100/50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-[9px] text-slate-400 leading-normal">
                    💡 <strong>Tags Suportadas:</strong> [Responsável], [Paciente], [Data], [Hora], [Clínica] e [Evento] (apenas na matrícula).
                  </div>
                </div>

                {/* Testing Section */}
                <div className="pt-4 border-t border-[#E5E3DB] dark:border-[#2E3832] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-emerald-500" /> Simulador de Webhook
                    </h4>
                    
                    <div className="flex bg-[#F9F8F3] dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setSelectedTestTrigger('reminder')}
                        className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${
                          selectedTestTrigger === 'reminder' 
                            ? 'bg-emerald-500 text-white' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        Lembrete
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTestTrigger('confirmation')}
                        className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${
                          selectedTestTrigger === 'confirmation' 
                            ? 'bg-emerald-500 text-white' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        Matrícula
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Logs console */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Live Logs:
                      </div>
                      <div className="bg-slate-950 text-[#00FF66] font-mono p-3 rounded-xl border border-slate-800 text-[9px] h-36 overflow-y-auto leading-relaxed shadow-inner">
                        {testLogs.length > 0 ? (
                          testLogs.map((log, index) => <div key={index} className="truncate">{log}</div>)
                        ) : (
                          <div className="text-slate-500 italic text-center pt-8">Console aguardando simulação de teste...</div>
                        )}
                      </div>
                    </div>

                    {/* Payload Viewer */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <Code className="w-3.5 h-3.5" /> Payload JSON Enviado:
                      </div>
                      <div className="bg-slate-950 text-sky-400 font-mono p-3 rounded-xl border border-slate-800 text-[9px] h-36 overflow-y-auto leading-relaxed shadow-inner">
                        {testPayload ? (
                          <pre className="whitespace-pre-wrap">{testPayload}</pre>
                        ) : (
                          <div className="text-slate-500 italic text-center pt-8">Payload aparecerá aqui ao disparar o teste...</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSimulateTestWebhook}
                    disabled={isTestingWebhook}
                    className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isTestingWebhook ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Transmitindo Webhook para {webhookUrl || 'URL Indefinida'}...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Disparar Webhook de Teste Agora
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
