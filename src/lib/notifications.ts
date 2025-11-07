/**
 * Utilidades para manejar notificaciones del navegador
 */

export type NotificationPermission = 'granted' | 'denied' | 'default';

/**
 * Verifica si las notificaciones están soportadas por el navegador
 */
export function areNotificationsSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Obtiene el estado actual del permiso de notificaciones
 */
export function getNotificationPermission(): NotificationPermission {
  if (!areNotificationsSupported()) return 'denied';
  return Notification.permission as NotificationPermission;
}

/**
 * Solicita permiso para mostrar notificaciones
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!areNotificationsSupported()) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Muestra una notificación del sistema
 */
export function showNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!areNotificationsSupported()) {
    console.warn('Notifications not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }

  try {
    return new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });
  } catch (error) {
    console.error('Error showing notification:', error);
    return null;
  }
}

/**
 * Verifica si las notificaciones están habilitadas en localStorage
 */
export function areNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const enabled = localStorage.getItem('notifications-enabled');
  return enabled === 'true';
}

/**
 * Guarda la preferencia de notificaciones
 */
export function setNotificationsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('notifications-enabled', String(enabled));
}

/**
 * Notificaciones predefinidas para FinanTrack
 */
export const FinanTrackNotifications = {
  /**
   * Notifica cuando se acerca el límite del presupuesto
   */
  budgetWarning: (categoryName: string, percentage: number) => {
    if (!areNotificationsEnabled()) return null;
    
    return showNotification('⚠️ Alerta de Presupuesto', {
      body: `Has gastado ${percentage}% de tu presupuesto en ${categoryName}.`,
      tag: 'budget-warning',
    });
  },

  /**
   * Notifica cuando se excede el presupuesto
   */
  budgetExceeded: (categoryName: string) => {
    if (!areNotificationsEnabled()) return null;
    
    return showNotification('🚨 Presupuesto Excedido', {
      body: `Has excedido el presupuesto de ${categoryName}.`,
      tag: 'budget-exceeded',
      requireInteraction: true,
    });
  },

  /**
   * Notifica progreso de una meta
   */
  goalProgress: (goalName: string, percentage: number) => {
    if (!areNotificationsEnabled()) return null;
    
    return showNotification('🎯 Progreso de Meta', {
      body: `¡Has alcanzado el ${percentage}% de tu meta "${goalName}"!`,
      tag: 'goal-progress',
    });
  },

  /**
   * Notifica cuando se completa una meta
   */
  goalCompleted: (goalName: string) => {
    if (!areNotificationsEnabled()) return null;
    
    return showNotification('🎉 ¡Meta Alcanzada!', {
      body: `¡Felicidades! Has completado tu meta "${goalName}".`,
      tag: 'goal-completed',
      requireInteraction: true,
    });
  },

  /**
   * Notifica sobre una nueva transacción
   */
  newTransaction: (type: 'income' | 'expense', amount: number) => {
    if (!areNotificationsEnabled()) return null;
    
    const emoji = type === 'income' ? '💰' : '💸';
    const typeText = type === 'income' ? 'Ingreso' : 'Gasto';
    
    return showNotification(`${emoji} Nuevo ${typeText}`, {
      body: `Se ha registrado un ${typeText.toLowerCase()} de $${amount.toFixed(2)}.`,
      tag: 'new-transaction',
    });
  },
};
