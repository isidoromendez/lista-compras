# Lista de compras

Lista de compras compartida para la familia. App en Expo (Android + web) con Firebase: login solo para usuarios autorizados y lista en tiempo real.

## Flujo de trabajo

1. Se pide un cambio en el chat con Claude.
2. Claude crea una rama y abre un pull request.
3. GitHub Actions compila la versión web y la publica en un **preview channel** de Firebase Hosting (URL temporal, vence a los 7 días). El link aparece como comentario en el PR.
4. Se revisa el preview desde el navegador (también desde el celular).
5. Al mergear a `main`, se despliega a producción.

## Acceso

Para usar la lista hacen falta dos cosas:

1. **Cuenta:** el usuario existe en Firebase Console → Authentication (creado a mano; el registro público está desactivado). Puede entrar con email y contraseña o con Google usando el mismo email.
2. **Membresía:** existe el documento `miembros/<email en minúsculas>` en Firestore. Las reglas de seguridad solo dejan leer y escribir la lista a los miembros, así que es la barrera definitiva.

Para dar de alta a alguien: crear el usuario en Authentication y agregar su documento en la colección `miembros` (el ID del documento es el email; el contenido puede ser solo un campo `nombre`).
Para quitarle el acceso: borrar su documento de `miembros` (y, si se quiere, su usuario).

## Configuración (una sola vez)

- `.firebaserc`: ID del proyecto de Firebase.
- Secret de GitHub `FIREBASE_SERVICE_ACCOUNT`: JSON de una cuenta de servicio con permisos para desplegar Hosting.

## Comandos locales

```bash
npm install
npx expo start                   # desarrollo (Expo Go o navegador)
npx tsc --noEmit                 # typecheck
npx expo export --platform web   # build web en dist/
```
