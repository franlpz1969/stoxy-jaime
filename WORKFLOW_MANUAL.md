# Manual de Desarrollo y Despliegue - Stoxy

Este documento describe el flujo de trabajo estándar para desarrollar, probar y desplegar cambios en la aplicación **Stoxy**.

---

## 🏗️ Flujo de Trabajo (Workflow)

El ciclo de vida del desarrollo sigue el estándar **Git Flow simplificado** + **CI/CD manual** hacia Google Cloud.

1.  **Desarrollo (`development`)**: Todos los cambios nuevos se hacen aquí.
2.  **Producción (`main`)**: Rama estable. Solo se actualiza cuando los cambios en `development` están probados.
3.  **Despliegue (Google Cloud)**: Se realiza desde `main` usando Cloud Run.

---

## 1️⃣ Fase de Desarrollo (Local)

Siempre trabaja en la rama `development`. Nunca hagas cambios directos en `main`.

### 1.1 Crear o cambiar a la rama de desarrollo
```bash
# Cambiar a la rama de desarrollo
git checkout development

# O crearla si no existe
git checkout -b development
```

### 1.2 Programar y Probar
Realiza tus cambios en el código. Para probar localmente:
```bash
# Iniciar servidor de desarrollo (Frontend + Backend)
./start-local.sh
```
*   Accede a la app en: `http://localhost:5001`
*   Verifica que todo funcione correctamente.

### 1.3 Guardar cambios (Commit)
Cuando termines una funcionalidad o arreglo:
```bash
git add .
git commit -m "Descripción clara de los cambios (ej: Fix login error)"
```

---

## 2️⃣ Fase de Fusión (Merge a Main)

Una vez que los cambios en `development` están probados y listos para producción.

### 2.1 Actualizar Main
```bash
# 1. Moverse a main
git checkout main

# 2. Fusionar los cambios de development
git merge development
```

### 2.2 Subir al repositorio (Opcional si usas GitHub/GitLab)
```bash
git push origin main
```

*Nota: Después del merge, puedes volver a `git checkout development` para seguir trabajando en nuevas cosas.*

---

## 3️⃣ Fase de Despliegue (Google Cloud)

Desplegamos la versión estable de `main` en la infraestructura de Google Cloud Run.

### 3.1 Ejecutar Script de Despliegue
Asegúrate de estar en la raíz del proyecto y tener configurada tu cuenta de Google Cloud (`gcloud auth login`).

```bash
# Ejecutar el script automático
./deploy.sh
```

### ¿Qué hace este script?
1.  **Build**: Construye una nueva imagen Docker de la aplicación.
2.  **Push**: Sube la imagen al Google Artifact Registry.
3.  **Deploy**: Actualiza el servicio `stocktracker-pro` en Cloud Run.

## 3️⃣ Fase de Despliegue (Google VM)

Desplegamos la versión estable de `main` en tu servidor dedicado `stoxy-vm`.

### 3.1 Ejecutar Script de Despliegue
```bash
./deploy.sh
```

### ¿Qué hace este script?
1.  **Conecta**: Entra por SSH a tu servidor.
2.  **Baja**: Descarga la última versión de tu app (Docker).
3.  **Persiste**: Asegura que la base de datos no se borre.
4.  **Lanza**: Reinicia el servicio en el puerto 80.

### 3.2 Verificar
Al finalizar, el script te dará la IP. Entra en `http://34.63.115.127`

---

## 4️⃣ Setup Inicial (Solo si cambias de servidor)

Si borras la VM y creas una nueva, necesitarás preparar el entorno una única vez:
```bash
./setup_vm.sh
```
*(Esto instala Docker y configura permisos)*

---

##  RESUMEN RÁPIDO

```bash
# 1. PROGRAMAR
git checkout development
# ...hacer cambios...
./start-local.sh  # Probar

# 2. GUARDAR Y FUSIONAR
git add .
git commit -m "Mejoras listas"
git checkout main
git merge development
git push origin main

# 3. DESPLEGAR
./deploy.sh
```
