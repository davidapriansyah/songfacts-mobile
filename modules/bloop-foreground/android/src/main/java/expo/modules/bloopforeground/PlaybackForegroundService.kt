package expo.modules.bloopforeground

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * Android foreground service whose only job is to keep the app process alive
 * (raised to foreground importance) so the hidden YouTube WebView keeps running
 * and keeps playing audio while the app is in the background.
 *
 * It shows a persistent media notification so the user can get back into the app.
 */
class PlaybackForegroundService : Service() {

  companion object {
    private const val TAG = "BloopForeground"
    const val CHANNEL_ID = "bloop_playback"
    const val NOTIFICATION_ID = 4711

    const val ACTION_START = "expo.modules.bloopforeground.START"
    const val ACTION_UPDATE = "expo.modules.bloopforeground.UPDATE"

    const val EXTRA_TITLE = "title"
    const val EXTRA_ARTIST = "artist"
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val title = intent?.getStringExtra(EXTRA_TITLE) ?: "Bloop"
    val artist = intent?.getStringExtra(EXTRA_ARTIST) ?: ""
    promoteToForeground(title, artist)
    // Not sticky: if the OS kills us we do not want to resurrect a stale player.
    return START_NOT_STICKY
  }

  private fun promoteToForeground(title: String, artist: String) {
    createChannel()
    val notification = buildNotification(title, artist)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Pemutaran musik",
      NotificationManager.IMPORTANCE_LOW
    ).apply {
      description = "Menjaga musik tetap berjalan di latar belakang"
      setShowBadge(false)
    }
    manager.createNotificationChannel(channel)
  }

  private fun buildNotification(title: String, artist: String): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val contentIntent = if (launchIntent != null) {
      PendingIntent.getActivity(
        this,
        0,
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    } else {
      null
    }

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setContentTitle(title)
      .setContentText(artist)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setPriority(NotificationCompat.PRIORITY_LOW)

    if (contentIntent != null) {
      builder.setContentIntent(contentIntent)
    }

    return builder.build()
  }

  override fun onDestroy() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    super.onDestroy()
  }
}
