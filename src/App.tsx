import React, { useState, useEffect } from 'react';
import {
  Clinic,
  TherapeuticEvent,
  Patient,
  Registration,
  EvolutionaryAssessment,
  MedicalRecord,
  Appointment,
  FinancialTransaction,
  Attendance,
  UserRole,
  SystemUser,
} from './types';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import {
  COLLECTIONS,
  subscribeCollection,
  subscribeDocument,
  saveDocument,
  removeDocument,
  getDocument,
} from './services/dbService';

// Component imports
import { Menu, AlertCircle, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PatientCRM from './components/PatientCRM';
import ScheduleCalendar from './components/ScheduleCalendar';
import EventManagement from './components/EventManagement';
import FinancialHub from './components/FinancialHub';
import ReportsCenter from './components/ReportsCenter';
import ClinicSettings from './components/ClinicSettings';
import CommunicationSettings from './components/CommunicationSettings';
import PublicRegistration from './components/PublicRegistration';
import { Login } from './components/Login';
import StudySearch from './components/StudySearch';

export default function App() {
  // Master database state definitions synchronized with Firebase
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [events, setEvents] = useState<TherapeuticEvent[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [assessments, setAssessments] = useState<EvolutionaryAssessment[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);

  // System User Auth and Session state
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [currentClinic, setCurrentClinic] = useState<Clinic | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('Admin');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Connection and feedback states
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');
  const [publicEventId, setPublicEventId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventIdParam = params.get('publicEventId');
    if (eventIdParam) {
      setPublicEventId(eventIdParam);
    }
  }, []);

  // 1. AUTHENTICATION SESSION INITIALIZATION
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      setAuthLoading(true);
      setAuthError('');

      if (firebaseUser && firebaseUser.email) {
        try {
          const cleanEmail = firebaseUser.email.toLowerCase().trim();
          const tokenResult = await firebaseUser.getIdTokenResult();
          const superClaim =
            tokenResult.claims?.superadmin === true ||
            (firebaseUser.emailVerified && cleanEmail === 'jossiefreitas.jgf@gmail.com');
          setIsSuperAdmin(superClaim);

          const systemUser = await getDocument<SystemUser>(COLLECTIONS.USERS, cleanEmail);

          if (systemUser) {
            if (systemUser.status === 'Ativo' || superClaim) {
              setCurrentUser(systemUser);
              setCurrentRole(superClaim ? 'Desenvolvedor' : systemUser.role);

              const clinicDoc = await getDocument<Clinic>(COLLECTIONS.CLINICS, systemUser.clinicId);
              if (clinicDoc) {
                setCurrentClinic(clinicDoc);
              } else if (superClaim) {
                const defaultClinic: Clinic = {
                  id: systemUser.clinicId || 'clinic-1',
                  name: 'CSM Clinical - Matriz',
                  document: '00.000.000/0001-00',
                  address: '',
                  phone: '',
                  plan: 'Ouro',
                  status: 'Ativo',
                };
                await saveDocument(COLLECTIONS.CLINICS, defaultClinic.id, defaultClinic);
                setCurrentClinic(defaultClinic);
              } else {
                setAuthError('Clínica vinculada ao usuário não encontrada no Firestore.');
              }
            } else {
              await signOut(auth);
              setCurrentUser(null);
              setCurrentClinic(null);
              setAuthError('Acesso indisponível: este usuário está marcado como Inativo.');
            }
          } else if (superClaim) {
            const fallbackSuperUser: SystemUser = {
              id: cleanEmail,
              clinicId: 'clinic-1',
              name: firebaseUser.displayName || 'Jossie Freitas',
              email: cleanEmail,
              role: 'Desenvolvedor',
              status: 'Ativo',
              createdAt: new Date().toISOString().split('T')[0],
            };
            setCurrentUser(fallbackSuperUser);
            setCurrentRole('Desenvolvedor');
            const clinicDoc = await getDocument<Clinic>(COLLECTIONS.CLINICS, 'clinic-1');
            if (clinicDoc) {
              setCurrentClinic(clinicDoc);
            } else {
              const defaultClinic: Clinic = {
                id: 'clinic-1',
                name: 'CSM Clinical - Matriz',
                document: '00.000.000/0001-00',
                address: '',
                phone: '',
                plan: 'Ouro',
                status: 'Ativo',
              };
              await saveDocument(COLLECTIONS.CLINICS, 'clinic-1', defaultClinic);
              setCurrentClinic(defaultClinic);
            }
          } else {
            await signOut(auth);
            setCurrentUser(null);
            setCurrentClinic(null);
            setAuthError(
              'Perfil de usuário não provisionado no Firestore. Solicite ao administrador o cadastro via Admin CLI.'
            );
          }
        } catch (err) {
          console.error('Error during session validation:', err);
          setCurrentUser(null);
          setCurrentClinic(null);
          setAuthError('Não foi possível validar o perfil no Firestore. Verifique suas permissões.');
        }
      } else {
        setIsSuperAdmin(false);
        setCurrentUser(null);
        setCurrentClinic(null);
      }
      setAuthLoading(false);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // 2. REAL-TIME MULTI-TENANT DATABASE SYNCHRONIZATION (MATCHING FIRESTORE RULES)
  useEffect(() => {
    if (!currentUser || !currentClinic) return;

    const clinicId = currentClinic.id;
    const realRole = currentUser.role;
    const unsubscribers: Array<() => void> = [];

    const handleSubError = (err: Error) => {
      console.error('Subscription error:', err);
    };

    // Clinics: superadmin can list all; staff can get their own clinic document
    if (isSuperAdmin) {
      unsubscribers.push(
        subscribeCollection<Clinic>(COLLECTIONS.CLINICS, null, setClinics, true, handleSubError)
      );
    } else {
      unsubscribers.push(
        subscribeDocument<Clinic>(
          COLLECTIONS.CLINICS,
          clinicId,
          (c) => setClinics(c ? [c] : []),
          handleSubError
        )
      );
    }

    // Users: superadmin sees all, Admin sees clinic users, others see only themselves
    if (isSuperAdmin || realRole === 'Admin') {
      unsubscribers.push(
        subscribeCollection<SystemUser>(
          COLLECTIONS.USERS,
          clinicId,
          setSystemUsers,
          isSuperAdmin,
          handleSubError
        )
      );
    } else {
      setSystemUsers([currentUser]);
    }

    const isStaff = isSuperAdmin || ['Admin', 'Fisio', 'Recepcao'].includes(realRole);
    const isClinical = isSuperAdmin || ['Admin', 'Fisio'].includes(realRole);
    const isAdmin = isSuperAdmin || realRole === 'Admin';

    if (isStaff) {
      unsubscribers.push(
        subscribeCollection<TherapeuticEvent>(
          COLLECTIONS.EVENTS,
          clinicId,
          setEvents,
          isSuperAdmin,
          handleSubError
        ),
        subscribeCollection<Patient>(
          COLLECTIONS.PATIENTS,
          clinicId,
          setPatients,
          isSuperAdmin,
          handleSubError
        ),
        subscribeCollection<Registration>(
          COLLECTIONS.REGISTRATIONS,
          clinicId,
          setRegistrations,
          isSuperAdmin,
          handleSubError
        ),
        subscribeCollection<Appointment>(
          COLLECTIONS.APPOINTMENTS,
          clinicId,
          setAppointments,
          isSuperAdmin,
          handleSubError
        ),
        subscribeCollection<Attendance>(
          COLLECTIONS.ATTENDANCES,
          clinicId,
          setAttendances,
          isSuperAdmin,
          handleSubError
        )
      );
    }

    if (isClinical) {
      unsubscribers.push(
        subscribeCollection<EvolutionaryAssessment>(
          COLLECTIONS.ASSESSMENTS,
          clinicId,
          setAssessments,
          isSuperAdmin,
          handleSubError
        ),
        subscribeCollection<MedicalRecord>(
          COLLECTIONS.MEDICAL_RECORDS,
          clinicId,
          setMedicalRecords,
          isSuperAdmin,
          handleSubError
        )
      );
    } else {
      setAssessments([]);
      setMedicalRecords([]);
    }

    if (isAdmin) {
      unsubscribers.push(
        subscribeCollection<FinancialTransaction>(
          COLLECTIONS.TRANSACTIONS,
          clinicId,
          setTransactions,
          isSuperAdmin,
          handleSubError
        )
      );
    } else {
      setTransactions([]);
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [currentUser, currentClinic?.id, isSuperAdmin]);

  // Sync currentClinic state to its updated values from Firestore
  useEffect(() => {
    if (currentClinic && clinics.length > 0) {
      const updated = clinics.find((c) => c.id === currentClinic.id);
      if (updated) {
        setCurrentClinic(updated);
      }
    }
  }, [clinics, currentClinic?.id]);

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setCurrentClinic(null);
    setIsSuperAdmin(false);
    setActiveTab('dashboard');
  };

  const handleOpenPublicFormByEvent = (eventId: string) => {
    setPublicEventId(eventId);
  };

  const runMutation = async (fn: () => Promise<void>, fallbackMessage: string) => {
    setActionError('');
    try {
      await fn();
    } catch (err) {
      console.error(fallbackMessage, err);
      setActionError(fallbackMessage);
    }
  };

  // 1. EVENT MANAGEMENT CALLBACKS
  const handleAddEvent = async (eventData: Omit<TherapeuticEvent, 'id' | 'clinicId'>) => {
    if (!currentClinic) return;
    await runMutation(async () => {
      const id = `event-${Date.now()}`;
      const newEvent: TherapeuticEvent = {
        ...eventData,
        id,
        clinicId: currentClinic.id,
      };
      await saveDocument(COLLECTIONS.EVENTS, id, newEvent);
    }, 'Sem permissão ou erro ao criar evento.');
  };

  const handleUpdateEventStatus = async (id: string, status: TherapeuticEvent['status']) => {
    await runMutation(async () => {
      await saveDocument(COLLECTIONS.EVENTS, id, { status });
      if (status === 'Cancelado') {
        const eventRegs = registrations.filter((r) => r.eventId === id);
        for (const reg of eventRegs) {
          await saveDocument(COLLECTIONS.REGISTRATIONS, reg.id, {
            status: 'Cancelado',
            patientId: reg.patientId || reg.childId,
          });
        }
      }
    }, 'Sem permissão ou erro ao atualizar status do evento.');
  };

  const handleDeleteEvent = async (id: string) => {
    await runMutation(async () => {
      await removeDocument(COLLECTIONS.EVENTS, id);
    }, 'Sem permissão ou erro ao excluir evento.');
  };

  const handleToggleAttendance = async (eventId: string, patientId: string, present: boolean) => {
    if (!currentClinic) return;
    await runMutation(async () => {
      const existing = attendances.find((a) => a.eventId === eventId && a.patientId === patientId);
      const event = events.find((e) => e.id === eventId);
      const id = existing ? existing.id : `att-${Date.now()}`;
      await saveDocument(COLLECTIONS.ATTENDANCES, id, {
        id,
        clinicId: existing?.clinicId || event?.clinicId || currentClinic.id,
        eventId,
        patientId,
        present,
        notes: existing ? existing.notes : '',
      });
    }, 'Sem permissão ou erro ao registrar presença.');
  };

  const handleUpdateAttendanceNotes = async (eventId: string, patientId: string, notes: string) => {
    if (!currentClinic) return;
    await runMutation(async () => {
      const existing = attendances.find((a) => a.eventId === eventId && a.patientId === patientId);
      const event = events.find((e) => e.id === eventId);
      const id = existing ? existing.id : `att-${Date.now()}`;
      await saveDocument(COLLECTIONS.ATTENDANCES, id, {
        id,
        clinicId: existing?.clinicId || event?.clinicId || currentClinic.id,
        eventId,
        patientId,
        present: existing ? existing.present : true,
        notes,
      });
    }, 'Sem permissão ou erro ao salvar observações de presença.');
  };

  // 2. PATIENT CRM CALLBACKS
  const handleAddPatient = async (patientData: Omit<Patient, 'id' | 'clinicId' | 'photo' | 'createdAt'>) => {
    if (!currentClinic) return;
    await runMutation(async () => {
      const id = `patient-${Date.now()}`;
      const newPatient: Patient = {
        ...patientData,
        id,
        clinicId: currentClinic.id,
        photo: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&q=80&w=200',
        createdAt: new Date().toISOString(),
      };
      await saveDocument(COLLECTIONS.PATIENTS, id, newPatient);
      setSelectedPatientId(id);
    }, 'Sem permissão ou erro ao cadastrar paciente.');
  };

  const handleUpdatePatient = async (id: string, patch: Partial<Patient>) => {
    await runMutation(async () => {
      await saveDocument(COLLECTIONS.PATIENTS, id, patch);
    }, 'Sem permissão ou erro ao atualizar paciente.');
  };

  const handleAddAssessment = async (
    patientId: string,
    assData: Omit<EvolutionaryAssessment, 'id' | 'patientId' | 'date' | 'author'>
  ) => {
    if (!currentClinic) return;
    await runMutation(async () => {
      const patient = patients.find((p) => p.id === patientId);
      const id = `eval-${Date.now()}`;
      const newAss: EvolutionaryAssessment = {
        ...assData,
        id,
        clinicId: patient?.clinicId || currentClinic.id,
        patientId,
        date: new Date().toISOString().split('T')[0],
        author: currentUser?.name || 'Profissional',
      };
      await saveDocument(COLLECTIONS.ASSESSMENTS, id, newAss);
    }, 'Sem permissão ou erro ao salvar avaliação evolutiva.');
  };

  const handleAddMedicalRecord = async (
    patientId: string,
    recData: Omit<MedicalRecord, 'id' | 'patientId' | 'date' | 'author'>
  ) => {
    if (!currentClinic) return;
    await runMutation(async () => {
      const patient = patients.find((p) => p.id === patientId);
      const id = `rec-${Date.now()}`;
      const newRecord: MedicalRecord = {
        ...recData,
        id,
        clinicId: patient?.clinicId || currentClinic.id,
        patientId,
        date: new Date().toISOString().split('T')[0],
        author: currentUser?.name || 'Profissional',
      };
      await saveDocument(COLLECTIONS.MEDICAL_RECORDS, id, newRecord);
    }, 'Sem permissão ou erro ao salvar prontuário.');
  };

  // 3. APPOINTMENT SCHEDULING CALLBACKS
  const handleAddAppointment = async (appData: Omit<Appointment, 'id' | 'clinicId' | 'patientName'>) => {
    if (!currentClinic) return;
    await runMutation(async () => {
      const child = patients.find((p) => p.id === appData.patientId);
      const id = `app-${Date.now()}`;
      const newApp: Appointment = {
        ...appData,
        id,
        clinicId: child?.clinicId || currentClinic.id,
        patientName: child ? child.name : 'Paciente Desconhecido',
      };
      await saveDocument(COLLECTIONS.APPOINTMENTS, id, newApp);

      if (newApp.status === 'Realizado' && (isSuperAdmin || currentUser?.role === 'Admin')) {
        const txId = `tx-${Date.now()}`;
        const newTx: FinancialTransaction = {
          id: txId,
          clinicId: newApp.clinicId,
          type: 'Receita',
          category: 'Atendimento Particular',
          value: newApp.price,
          date: newApp.date,
          description: `Sessão ${newApp.type} - ${newApp.patientName}`,
          referenceId: id,
        };
        await saveDocument(COLLECTIONS.TRANSACTIONS, txId, newTx);
      }
    }, 'Sem permissão ou erro ao criar agendamento.');
  };

  const handleUpdateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    const a = appointments.find((app) => app.id === id);
    if (!a) return;
    const oldStatus = a.status;

    await runMutation(async () => {
      await saveDocument(COLLECTIONS.APPOINTMENTS, id, { status });

      if (
        status === 'Realizado' &&
        oldStatus !== 'Realizado' &&
        (isSuperAdmin || currentUser?.role === 'Admin')
      ) {
        const txExists = transactions.some((t) => t.referenceId === id);
        if (!txExists) {
          const txId = `tx-${Date.now()}`;
          const newTx: FinancialTransaction = {
            id: txId,
            clinicId: a.clinicId,
            type: 'Receita',
            category: 'Atendimento Particular',
            value: a.price,
            date: a.date,
            description: `Sessão ${a.type} - ${a.patientName}`,
            referenceId: id,
          };
          await saveDocument(COLLECTIONS.TRANSACTIONS, txId, newTx);
        }
      }
    }, 'Sem permissão ou erro ao atualizar agendamento.');
  };

  const handleDeleteAppointment = async (id: string) => {
    await runMutation(async () => {
      await removeDocument(COLLECTIONS.APPOINTMENTS, id);
    }, 'Sem permissão ou erro ao excluir agendamento.');
  };

  // 4. FINANCIAL LEDGER CALLBACKS
  const handleAddTransaction = async (txData: Omit<FinancialTransaction, 'id' | 'clinicId'>) => {
    if (!currentClinic) return;
    await runMutation(async () => {
      const id = `tx-${Date.now()}`;
      const newTx: FinancialTransaction = {
        ...txData,
        id,
        clinicId: currentClinic.id,
      };
      await saveDocument(COLLECTIONS.TRANSACTIONS, id, newTx);
    }, 'Sem permissão ou erro ao registrar transação financeira.');
  };

  const handleDeleteTransaction = async (id: string) => {
    await runMutation(async () => {
      await removeDocument(COLLECTIONS.TRANSACTIONS, id);
    }, 'Sem permissão ou erro ao excluir transação.');
  };

  // 5. REGISTRATION AND BILLING CENTER
  const handleApproveRegistration = async (id: string) => {
    const reg = registrations.find((r) => r.id === id);
    if (!reg) return;

    await runMutation(async () => {
      await saveDocument(COLLECTIONS.REGISTRATIONS, id, {
        status: 'Aprovado',
        patientId: reg.patientId || reg.childId,
      });

      const matchedEvent = events.find((e) => e.id === reg.eventId);
      if (matchedEvent && (isSuperAdmin || currentUser?.role === 'Admin')) {
        const txId = `tx-${Date.now()}`;
        const newTx: FinancialTransaction = {
          id: txId,
          clinicId: reg.clinicId,
          type: 'Receita',
          category: 'Inscrição de Evento',
          value: matchedEvent.price,
          date: new Date().toISOString().split('T')[0],
          description: `Inscrição ${matchedEvent.name} - ${reg.childName} (${reg.registrationNumber})`,
          referenceId: reg.id,
        };
        await saveDocument(COLLECTIONS.TRANSACTIONS, txId, newTx);
      }
    }, 'Sem permissão ou erro ao aprovar inscrição.');
  };

  // 6. REGISTRATION FORM HANDLER (authenticated staff simulation / intake)
  const handleAddRegistrationFromPublicForm = async (
    patientInput: Omit<Patient, 'id' | 'clinicId' | 'photo' | 'createdAt'>,
    registrationInput: Omit<Registration, 'id' | 'clinicId' | 'registrationNumber' | 'date'>
  ) => {
    await runMutation(async () => {
      const matchedEvent = events.find((e) => e.id === registrationInput.eventId);
      const targetClinicId = matchedEvent ? matchedEvent.clinicId : currentClinic?.id || 'clinic-1';

      const foundPatient = patients.find(
        (p) =>
          p.clinicId === targetClinicId &&
          p.name.trim().toLowerCase() === patientInput.name.trim().toLowerCase()
      );

      let childId = '';
      if (foundPatient) {
        childId = foundPatient.id;
      } else {
        childId = `patient-${Date.now()}`;
        const newPatient: Patient = {
          ...patientInput,
          id: childId,
          clinicId: targetClinicId,
          photo: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&q=80&w=200',
          createdAt: new Date().toISOString(),
        };
        await saveDocument(COLLECTIONS.PATIENTS, childId, newPatient);
      }

      const regId = `reg-${Date.now() + 1}`;
      const newReg: Registration = {
        ...registrationInput,
        id: regId,
        clinicId: targetClinicId,
        childId,
        patientId: childId,
        registrationNumber: `INS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split('T')[0],
      };
      await saveDocument(COLLECTIONS.REGISTRATIONS, regId, newReg);

      if (
        newReg.status === 'Aprovado' &&
        matchedEvent &&
        (isSuperAdmin || currentUser?.role === 'Admin')
      ) {
        const txId = `tx-${Date.now() + 3}`;
        const newTx: FinancialTransaction = {
          id: txId,
          clinicId: targetClinicId,
          type: 'Receita',
          category: 'Inscrição de Evento',
          value: matchedEvent.price,
          date: new Date().toISOString().split('T')[0],
          description: `Inscrição ${matchedEvent.name} - ${newReg.childName} (${newReg.registrationNumber})`,
          referenceId: regId,
        };
        await saveDocument(COLLECTIONS.TRANSACTIONS, txId, newTx);
      }

      const appId = `app-${Date.now() + 2}`;
      const newAppointment: Appointment = {
        id: appId,
        clinicId: targetClinicId,
        patientId: childId,
        patientName: patientInput.name,
        date: matchedEvent ? matchedEvent.date : new Date().toISOString().split('T')[0],
        time: matchedEvent ? matchedEvent.time : '14:00',
        type: 'Integração Sensorial',
        price: matchedEvent ? matchedEvent.price : 150.0,
        status: 'Agendado',
      };
      await saveDocument(COLLECTIONS.APPOINTMENTS, appId, newAppointment);
    }, 'Sem permissão ou erro ao registrar inscrição.');
  };

  // 7. MULTI-CLINIC MANAGEMENT (Superadmin only per firestore.rules)
  const handleAddClinic = async (clinicData: Omit<Clinic, 'id'>) => {
    await runMutation(async () => {
      const id = `clinic-${Date.now()}`;
      const newClinic: Clinic = {
        ...clinicData,
        id,
        status: 'Ativo',
      };
      await saveDocument(COLLECTIONS.CLINICS, id, newClinic);
      setCurrentClinic(newClinic);
    }, 'Apenas Superadministradores podem criar novas clínicas.');
  };

  const handleUpdateClinicPlan = async (id: string, plan: Clinic['plan']) => {
    await runMutation(async () => {
      await saveDocument(COLLECTIONS.CLINICS, id, { plan });
    }, 'Apenas Superadministradores podem alterar planos da clínica.');
  };

  const handleUpdateClinicDetails = async (id: string, patch: Partial<Clinic>) => {
    await runMutation(async () => {
      await saveDocument(COLLECTIONS.CLINICS, id, patch);
    }, 'Sem permissão para alterar dados da clínica (requer Superadmin).');
  };

  const handleAddSystemUser = async (_userData: Omit<SystemUser, 'id' | 'createdAt'>) => {
    setActionError(
      'Criação de novos usuários deve ser executada via Firebase Admin CLI (npm run admin -- create-user) por segurança.'
    );
  };

  const handleUpdateSystemUser = async (id: string, patch: Partial<SystemUser>) => {
    await runMutation(async () => {
      const safePatch: Partial<SystemUser> = {};
      if (patch.name !== undefined) safePatch.name = patch.name;
      if (patch.status !== undefined) safePatch.status = patch.status;
      if (patch.role !== undefined) safePatch.role = patch.role;
      await saveDocument(COLLECTIONS.USERS, id, safePatch);
    }, 'Sem permissão para atualizar este usuário.');
  };

  const handleDeleteSystemUser = async (_id: string) => {
    setActionError(
      'Exclusão de usuários é bloqueada no navegador pelas regras de segurança. Altere o status para Inativo ou use o Firebase Admin CLI.'
    );
  };

  // Render loading spinner when resolving Firebase session
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F5] text-slate-800 dark:bg-[#121614] dark:text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9BB0A5] mb-4"></div>
        <p className="font-serif italic text-lg font-semibold">Carregando CSM Clinical...</p>
        <p className="text-xs text-slate-400 mt-1">Conectando ao banco de dados Firebase seguro</p>
      </div>
    );
  }

  if (!currentUser || !currentClinic) {
    return (
      <Login
        systemUsers={systemUsers}
        onLoginSuccess={() => {}}
        onRegisterUser={() => {}}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        clinics={clinics}
        externalError={authError}
      />
    );
  }

  // Authenticated intake / public form preview
  if (publicEventId) {
    return (
      <PublicRegistration
        events={events}
        selectedEventId={publicEventId}
        onBackToCRM={() => {
          setPublicEventId(null);
          window.history.pushState({}, document.title, window.location.pathname);
        }}
        onAddRegistration={handleAddRegistrationFromPublicForm}
        patients={patients}
      />
    );
  }

  return (
    <div
      className={`min-h-screen flex ${
        darkMode ? 'dark bg-[#1B221E] text-[#ECEBE5]' : 'bg-[#F9F8F3] text-[#2D312E]'
      }`}
    >
      {/* Sidebar navigation components */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        clinics={clinics}
        currentClinic={currentClinic}
        setCurrentClinic={setCurrentClinic}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
        registrations={registrations}
        appointments={appointments}
        events={events}
      />

      {/* Floating Menu Toggle Button when options bar is hidden */}
      {!sidebarOpen && (
        <button
          id="btn-sidebar-toggle-show"
          onClick={() => setSidebarOpen(true)}
          className={`fixed bottom-6 left-6 z-40 p-4 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 duration-200 border ${
            darkMode
              ? 'bg-[#242D28] text-[#9BB0A5] border-[#2E3832] hover:bg-[#2E3832]'
              : 'bg-[#9BB0A5] text-white border-[#8A9F94] hover:bg-[#8A9F94]'
          }`}
          title="Exibir Menu de Opções"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Main Content View */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto h-screen max-w-(screen-xl) mx-auto w-full">
        {actionError && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-xs font-semibold flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError('')}
              className="p-1 hover:opacity-75 cursor-pointer"
              aria-label="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            currentClinic={currentClinic}
            patients={patients}
            events={events}
            appointments={appointments}
            transactions={transactions}
            registrations={registrations}
            setActiveTab={setActiveTab}
            setSelectedPatientId={setSelectedPatientId}
            darkMode={darkMode}
            currentRole={currentRole}
          />
        )}

        {activeTab === 'patients' && (
          <PatientCRM
            currentClinic={currentClinic}
            patients={patients}
            assessments={assessments}
            medicalRecords={medicalRecords}
            events={events}
            registrations={registrations}
            darkMode={darkMode}
            onAddPatient={handleAddPatient}
            onUpdatePatient={handleUpdatePatient}
            onAddAssessment={handleAddAssessment}
            onAddMedicalRecord={handleAddMedicalRecord}
            selectedPatientId={selectedPatientId}
            setSelectedPatientId={setSelectedPatientId}
            attendances={attendances}
          />
        )}

        {activeTab === 'agenda' && (
          <ScheduleCalendar
            currentClinic={currentClinic}
            appointments={appointments}
            patients={patients}
            onAddAppointment={handleAddAppointment}
            onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
            onDeleteAppointment={handleDeleteAppointment}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'eventos' && (
          <EventManagement
            currentClinic={currentClinic}
            events={events}
            registrations={registrations}
            patients={patients}
            attendances={attendances}
            onAddEvent={handleAddEvent}
            onUpdateEventStatus={handleUpdateEventStatus}
            onToggleAttendance={handleToggleAttendance}
            onUpdateAttendanceNotes={handleUpdateAttendanceNotes}
            onDeleteEvent={handleDeleteEvent}
            onOpenPublicFormByEvent={handleOpenPublicFormByEvent}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'financeiro' && (
          <FinancialHub
            currentClinic={currentClinic}
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'relatorios' && (
          <ReportsCenter
            currentClinic={currentClinic}
            patients={patients}
            events={events}
            registrations={registrations}
            appointments={appointments}
            transactions={transactions}
            attendances={attendances}
            onApproveRegistration={handleApproveRegistration}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'clinicas' && (
          <ClinicSettings
            clinics={clinics}
            currentClinic={currentClinic}
            onAddClinic={handleAddClinic}
            onUpdateClinicPlan={handleUpdateClinicPlan}
            onUpdateClinicDetails={handleUpdateClinicDetails}
            systemUsers={systemUsers}
            onAddSystemUser={handleAddSystemUser}
            onUpdateSystemUser={handleUpdateSystemUser}
            onDeleteSystemUser={handleDeleteSystemUser}
            setCurrentClinic={setCurrentClinic}
            darkMode={darkMode}
            currentUser={currentUser}
            currentRole={currentRole}
          />
        )}

        {activeTab === 'comunicacao' && (
          <CommunicationSettings
            currentClinic={currentClinic}
            onUpdateClinicDetails={handleUpdateClinicDetails}
            darkMode={darkMode}
          />
        )}

        {activeTab === 'busca_estudos' && <StudySearch darkMode={darkMode} />}
      </main>
    </div>
  );
}
