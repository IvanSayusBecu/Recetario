# Mi recetario: cómo ponerlo en marcha

Son tres pasos: la nube para las recetas (Supabase), la publicación (GitHub Pages) y la instalación en los teléfonos. Todo es gratis. Tardás unos 20 minutos la primera vez.

## 1. Crear la cuenta de GitHub

1. Entrá a https://github.com/signup y creá tu cuenta. Elegí bien el nombre de usuario, porque va a quedar en la dirección de la app.

## 2. Supabase: dónde viven las recetas

1. Entrá a https://supabase.com, tocá **Start your project** y entrá con tu cuenta de GitHub.
2. **New project**:
   - Nombre: `recetario`.
   - Database password: inventá una y guardala.
   - Región: **South America (São Paulo)**.
   - Esperá un par de minutos a que se cree.
3. Menú izquierdo › **SQL Editor** › **New query**. Abrí el archivo `supabase/1-crear-base.sql` con el Bloc de notas, copiá todo, pegalo y tocá **Run**.
4. Otra **New query** con `supabase/2-cargar-recetas.sql` › **Run**. Esto carga las 29 recetas.
5. **Authentication** › **Sign In / Providers** (a veces figura como Settings): desactivá **Allow new users to sign up**. Así nadie más puede crearse una cuenta.
6. **Authentication** › **Users** › **Add user** › **Create new user**:
   - Poné tu email y una contraseña.
   - Marcá **Auto Confirm User**.
   - Si más adelante querés que Caro u otra persona también edite, creale un usuario igual.
7. **Project Settings** › **API** (o **Data API** / **API Keys**). Copiá:
   - **Project URL** (algo como `https://abcd1234.supabase.co`).
   - La clave **anon public** (o **publishable**). La **secret** / **service_role** no va en la app.
8. Abrí `config.js` con el Bloc de notas y pegá los dos datos entre las comillas:

```js
window.RECETARIO_CONFIG = {
  supabaseUrl: 'https://abcd1234.supabase.co',
  supabaseAnonKey: 'eyJhbGciOi...'
};
```

La clave anon puede estar a la vista: lo que protege las recetas son las reglas del paso 3, que solo dejan editar a los usuarios del paso 6.

## 3. GitHub Pages: publicar la app

1. En GitHub: **+** (arriba a la derecha) › **New repository**.
   - Nombre: `recetario`.
   - Dejalo **Public**. Es obligatorio para Pages gratis; significa que el código y las fotos incluidas se pueden ver.
   - Tocá **Create repository**.
2. En la página del repositorio vacío, tocá **uploading an existing file**. Arrastrá **todo lo que hay adentro** de la carpeta `recetario-app`, no la carpeta en sí. Tiene que quedar `index.html` en la raíz. Después tocá **Commit changes**.
3. **Settings** › **Pages**:
   - Source: **Deploy from a branch**.
   - Branch: **main** y carpeta **/ (root)**.
   - Tocá **Save**.
4. En uno o dos minutos la app queda en `https://TU-USUARIO.github.io/recetario/`.

## 4. Instalar en el teléfono

- **Android (Chrome):** abrí el link › menú ⋮ › **Instalar app** (o **Agregar a la pantalla principal**).
- **iPhone (Safari):** abrí el link › botón Compartir › **Agregar a inicio**.

Queda con su ícono, se abre a pantalla completa y funciona sin internet con lo último que viste.

Para compartirla, mandá el link. Los demás ven las recetas y no pueden cambiar nada.

## 5. Editar y actualizar

- **Recetas:** abajo de todo en la lista, tocá **Entrar para editar** y usá el usuario del paso 2.6. Aparecen **Nueva receta**, **Editar** y **Borrar**. Lo que guardes lo ven todos la próxima vez que abran la app con internet. Para guardar necesitás conexión.
- **La app en sí** (diseño, funciones): subí al repositorio los archivos que cambien (**Add file** › **Upload files**, reemplazan a los anteriores). Los teléfonos toman la versión nueva al abrir la app con internet. Si cambia `sw.js`, aparece un aviso **Actualizar**.
