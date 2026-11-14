import crypto from "crypto";
import fs from "fs";
import path from "path";
import { initializeApp, cert, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function loadAppletConfig() {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error("firebase-applet-config.json não encontrado na raiz do projeto.");
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function getArg(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) return undefined;
  return args[index + 1];
}

function initAdmin() {
  const config = loadAppletConfig();
  const projectId = process.env.FIREBASE_PROJECT_ID || config.projectId;
  const databaseId = process.env.FIRESTORE_DATABASE_ID || config.firestoreDatabaseId || "(default)";

  if (getApps().length === 0) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credPath) {
      const resolved = path.resolve(credPath);
      if (!fs.existsSync(resolved)) {
        throw new Error(`Arquivo de conta de serviço não encontrado: ${resolved}`);
      }
      const serviceAccount = JSON.parse(fs.readFileSync(resolved, "utf8"));
      initializeApp({
        credential: cert(serviceAccount),
        projectId,
      });
    } else {
      initializeApp({
        credential: applicationDefault(),
        projectId,
      });
    }
  }

  return {
    auth: getAuth(),
    db: getFirestore(databaseId),
    projectId,
    databaseId,
  };
}

function generateTempPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;

  const pick = (charset) => charset[crypto.randomInt(0, charset.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  for (let i = 0; i < 12; i++) {
    chars.push(pick(all));
  }
  return chars.sort(() => crypto.randomInt(-1, 2)).join("");
}

function printHelp() {
  console.log(`
CSM Clinical — Admin CLI

Uso:
  npm run admin -- <comando> [opções]

Comandos:
  help
      Exibe esta ajuda.

  create-clinic --id <clinicId> --name "<nome>" --document "<cnpj>" [--plan Bronze|Prata|Ouro] [--phone "<tel>"] [--address "<end>"]
      Cria ou atualiza uma clínica no Firestore.

  create-user --email <email> --name "<nome>" --clinic <clinicId> --role Admin|Fisio|Recepcao|Desenvolvedor [--status Ativo|Inativo]
      Cria ou atualiza o usuário no Firebase Auth (com senha temporária aleatória se novo) e grava o perfil em users/{email}.

  reset-password --email <email>
      Gera uma senha temporária aleatória no Firebase Auth e revoga refresh tokens da conta.

  set-superadmin --email <email> [--revoke]
      Define (ou remove com --revoke) a custom claim superadmin=true no Firebase Auth.

Pré-requisito:
  Defina GOOGLE_APPLICATION_CREDENTIALS apontando para o JSON de conta de serviço (fora da pasta do projeto).
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  const { auth, db, projectId, databaseId } = initAdmin();
  console.log(`[Admin CLI] Projeto: ${projectId} | Banco Firestore: ${databaseId}`);

  if (command === "create-clinic") {
    const id = getArg(args, "--id") || `clinic-${Date.now()}`;
    const name = getArg(args, "--name");
    const document = getArg(args, "--document");
    const plan = getArg(args, "--plan") || "Prata";
    const phone = getArg(args, "--phone") || "";
    const address = getArg(args, "--address") || "";

    if (!name || !document) {
      throw new Error('Os parâmetros --name e --document são obrigatórios.');
    }

    await db.collection("clinics").doc(id).set(
      {
        id,
        name,
        document,
        plan,
        status: "Ativo",
        phone,
        address,
      },
      { merge: true }
    );
    console.log(`Clínica salva com sucesso: clinics/${id}`);
    return;
  }

  if (command === "create-user") {
    const rawEmail = getArg(args, "--email");
    const name = getArg(args, "--name");
    const clinicId = getArg(args, "--clinic");
    const role = getArg(args, "--role") || "Admin";
    const status = getArg(args, "--status") || "Ativo";

    if (!rawEmail || !name || !clinicId) {
      throw new Error("Os parâmetros --email, --name e --clinic são obrigatórios.");
    }
    if (!["Admin", "Fisio", "Recepcao", "Desenvolvedor"].includes(role)) {
      throw new Error("Cargo inválido. Use Admin, Fisio, Recepcao ou Desenvolvedor.");
    }

    const email = rawEmail.toLowerCase().trim();
    let tempPassword = null;

    try {
      await auth.getUserByEmail(email);
      console.log(`Usuário já existe no Firebase Auth: ${email}`);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        tempPassword = generateTempPassword();
        await auth.createUser({
          email,
          password: tempPassword,
          displayName: name,
          emailVerified: true,
        });
        console.log(`Usuário criado no Firebase Auth: ${email}`);
      } else {
        throw err;
      }
    }

    await db.collection("users").doc(email).set(
      {
        id: email,
        clinicId,
        name,
        email,
        role,
        status,
        createdAt: new Date().toISOString().split("T")[0],
      },
      { merge: true }
    );

    console.log(`Perfil salvo em Firestore: users/${email} (clinicId=${clinicId}, role=${role})`);
    if (tempPassword) {
      console.log(`Senha temporária gerada (exibida apenas aqui): ${tempPassword}`);
    }
    return;
  }

  if (command === "reset-password") {
    const rawEmail = getArg(args, "--email");
    if (!rawEmail) {
      throw new Error("O parâmetro --email é obrigatório.");
    }
    const email = rawEmail.toLowerCase().trim();
    const userRecord = await auth.getUserByEmail(email);
    const tempPassword = generateTempPassword();

    await auth.updateUser(userRecord.uid, { password: tempPassword });
    await auth.revokeRefreshTokens(userRecord.uid);

    console.log(`Senha redefinida e tokens revogados para ${email}.`);
    console.log(`Nova senha temporária (não compartilhe): ${tempPassword}`);
    return;
  }

  if (command === "set-superadmin") {
    const rawEmail = getArg(args, "--email");
    if (!rawEmail) {
      throw new Error("O parâmetro --email é obrigatório.");
    }
    const revoke = args.includes("--revoke");
    const email = rawEmail.toLowerCase().trim();
    const userRecord = await auth.getUserByEmail(email);

    await auth.setCustomUserClaims(userRecord.uid, {
      ...(userRecord.customClaims || {}),
      superadmin: !revoke,
    });
    await auth.revokeRefreshTokens(userRecord.uid);

    console.log(
      revoke
        ? `Permissão superadmin removida para ${email}.`
        : `Permissão superadmin ativada para ${email}. Faça novo login para renovar o token.`
    );
    return;
  }

  throw new Error(`Comando desconhecido: ${command}. Execute "npm run admin -- help".`);
}

main().catch((err) => {
  console.error(`[Erro Admin CLI] ${err.message}`);
  process.exit(1);
});
