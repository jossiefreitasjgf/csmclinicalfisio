# Redefinir a senha do administrador — CSM Clinical

**Conta informada:** `jossiefreitas.jgf@gmail.com`

A senha da conta real exige acesso autorizado ao Firebase Authentication do projeto `zany-tribute-fw2h4`. Não existe senha padrão incluída e não é necessário divulgar sua senha atual.

## Opção 1 — recuperação pelo próprio aplicativo (recomendada)

1. Abra o CSM Clinical já implantado, conectado ao Firebase correto.
2. Clique em **Recuperar senha / Esqueceu a senha?**.
3. Preencha `jossiefreitas.jgf@gmail.com` e clique em **Recuperar**.
4. Abra a mensagem recebida no Gmail e defina uma senha nova e exclusiva.
5. Faça login novamente. Verifique a pasta de spam se o e-mail demorar a chegar.

Requisitos: a conta deve existir no Firebase Authentication, o provedor **E-mail/senha** deve estar habilitado e o domínio do aplicativo (ex.: domínio `.vercel.app`) precisa estar autorizado em **Firebase Console > Authentication > Settings > Authorized domains**.

## Opção 2 — redefinição administrativa no terminal

Use somente se tiver acesso autorizado a uma **conta de serviço Firebase Admin**, armazenada fora da pasta do projeto. A conta de serviço não deve ser compartilhada ou colocada no repositório.

No Windows PowerShell, dentro da pasta do projeto:

```powershell
npm install
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\caminho\privado\firebase-service-account.json'
npm run admin -- reset-password --email jossiefreitas.jgf@gmail.com
```

Esse comando gera uma senha aleatória e temporária, altera-a no Firebase Authentication e revoga tokens de atualização da conta. A nova senha é mostrada **somente no terminal**. Não a envie por mensagem nem a salve em repositórios.

Se o comando informar que o usuário não existe, confira a conta no **Firebase Console > Authentication > Users** antes de criar ou modificar qualquer perfil. A autorização do tipo **Admin** ou **superadmin** é configurada separadamente no documento `users/{email}` e via custom claim (`npm run admin -- set-superadmin --email jossiefreitas.jgf@gmail.com`).

## Verificações importantes

- Confirme que o projeto selecionado é `zany-tribute-fw2h4` e o banco Firestore nomeado é `ai-studio-091de9b3-9e63-4295-9e14-b485f5ad1ce9`.
- Em caso de dúvida, prefira o fluxo de **Recuperar senha**; ele não exige baixar credenciais administrativas.
