# Manual de Desarrollo y Despliegue - Stoxy

Este documento describe el flujo de trabajo actual para **Stoxy**, simplificado para ejecución directa en VM sin Docker.

---

## 🏗️ Ciclo de Desarrollo

1.  **Local**: Probar cambios usando `./start-local.sh`.
2.  **Git**: Confirmar cambios en la rama `main`.
3.  **VM**: Desplegar los cambios en el servidor Google Cloud.

---

## 1️⃣ Desarrollo Local

Para iniciar el entorno completo (Frontend + Backend):
```bash
./start-local.sh
```
*   **Frontend**: `http://localhost:3000` (Vite dev server)
*   **Backend**: `http://localhost:3001` (Node API)

### Logos
La aplicación utiliza una política de **Google Favicon** para garantizar que todos los logos de empresas se cargan correctamente y con el icono oficial de su sitio web.

---

## 2️⃣ Despliegue

El despliegue se realiza directamente en la VM de Google Cloud (`stoxy-vm`). Hemos eliminado Docker para ganar velocidad y simplicidad.

### 2.1 Método Automático
Usa el script proporcionado para automatizar todo el proceso:
```bash
./deploy_manual.sh
```

### 2.2 Método Manual (en la VM)
Si prefieres hacerlo paso a paso dentro de la VM:
```bash
cd ~/stoxy-jaime
git pull
npm install
npm run build
pm2 restart stoxy-app
```

---

## 🧹 Limpieza de Proyecto

Se han eliminado los siguientes componentes obsoletos:
*   **Archivos Docker**: No se usan imágenes, se ejecuta Node directo.
*   **Cloud Run / Cloud Build**: El despliegue es en VM.
*   **Scripts Legacy**: Eliminados scripts de prueba (`testPrompt.js`, `listModels.js`).

---

## ⚙️ Configuración del Servidor (PM2)

La aplicación es gestionada por PM2. Comandos útiles:
*   `pm2 status`: Ver estado de la app.
*   `pm2 restart stoxy-app`: Reiniciar.
*   `pm2 logs stoxy-app`: Ver logs en tiempo real.
