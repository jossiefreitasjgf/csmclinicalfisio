import fs from "fs";
import path from "path";
import { initializeApp, cert, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function loadAppletConfig() {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error("firebase-applet-config.json não encontrado.");
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function initDb() {
  const config = loadAppletConfig();
  const projectId = process.env.FIREBASE_PROJECT_ID || config.projectId;
  const databaseId = process.env.FIRESTORE_DATABASE_ID || config.firestoreDatabaseId || "(default)";

  if (getApps().length === 0) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credPath) {
      const resolved = path.resolve(credPath);
      const serviceAccount = JSON.parse(fs.readFileSync(resolved, "utf8"));
      initializeApp({ credential: cert(serviceAccount), projectId });
    } else {
      initializeApp({ credential: applicationDefault(), projectId });
    }
  }

  return { db: getFirestore(databaseId), projectId, databaseId };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const { db, projectId, databaseId } = initDb();

  console.log(`[Migração] Projeto: ${projectId} | Banco: ${databaseId} | Modo: ${apply ? "APLICAR (--apply)" : "SIMULAÇÃO (dry-run)"}`);

  const patientsMap = new Map();
  const patientsSnap = await db.collection("patients").get();
  patientsSnap.forEach((d) => patientsMap.set(d.id, d.data()));

  const eventsMap = new Map();
  const eventsSnap = await db.collection("events").get();
  eventsSnap.forEach((d) => eventsMap.set(d.id, d.data()));

  let plannedUpdates = 0;

  // 1. Strip plaintext password field from users
  const usersSnap = await db.collection("users").get();
  for (const docSnap of usersSnap.docs) {
    const data = docSnap.data();
    if ("password" in data) {
      plannedUpdates++;
      console.log(`- users/${docSnap.id}: remover campo legado "password"`);
      if (apply) {
        await docSnap.ref.update({ password: FieldValue.delete() });
      }
    }
  }

  // 2. Backfill patientId on registrations
  const regsSnap = await db.collection("registrations").get();
  for (const docSnap of regsSnap.docs) {
    const data = docSnap.data();
    if (!data.patientId && data.childId) {
      plannedUpdates++;
      console.log(`- registrations/${docSnap.id}: adicionar patientId="${data.childId}"`);
      if (apply) {
        await docSnap.ref.update({ patientId: data.childId });
      }
    }
  }

  // 3. Backfill clinicId on attendances from events/patients
  const attSnap = await db.collection("attendances").get();
  for (const docSnap of attSnap.docs) {
    const data = docSnap.data();
    if (!data.clinicId) {
      const clinicId = eventsMap.get(data.eventId)?.clinicId || patientsMap.get(data.patientId)?.clinicId;
      if (clinicId) {
        plannedUpdates++;
        console.log(`- attendances/${docSnap.id}: adicionar clinicId="${clinicId}"`);
        if (apply) {
          await docSnap.ref.update({ clinicId });
        }
      } else {
        console.warn(`! attendances/${docSnap.id}: não foi possível inferir clinicId`);
      }
    }
  }

  // 4. Backfill clinicId on assessments and medicalRecords from patients
  for (const colName of ["assessments", "medicalRecords"]) {
    const snap = await db.collection(colName).get();
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (!data.clinicId) {
        const clinicId = patientsMap.get(data.patientId)?.clinicId;
        if (clinicId) {
          plannedUpdates++;
          console.log(`- ${colName}/${docSnap.id}: adicionar clinicId="${clinicId}"`);
          if (apply) {
            await docSnap.ref.update({ clinicId });
          }
        } else {
          console.warn(`! ${colName}/${docSnap.id}: não foi possível inferir clinicId`);
        }
      }
    }
  }

  console.log(`\nResumo: ${plannedUpdates} atualização(ões) ${apply ? "aplicadas" : "planejadas (execute com --apply para confirmar)"}.`);
}

main().catch((err) => {
  console.error(`[Erro Migração] ${err.message}`);
  process.exit(1);
});
