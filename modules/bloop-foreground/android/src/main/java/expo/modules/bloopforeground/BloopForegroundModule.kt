package expo.modules.bloopforeground

import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * JS bridge that starts / updates / stops the [PlaybackForegroundService].
 *
 * IMPORTANT: a foreground service may only be *started* while the app is in the
 * foreground (Android 12+ restriction). We therefore have JS call `start` when
 * playback begins (user tapped play), not when the app backgrounds.
 */
class BloopForegroundModule : Module() {

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("BloopForeground")

    Function("start") { title: String, artist: String ->
      startService(PlaybackForegroundService.ACTION_START, title, artist)
    }

    Function("update") { title: String, artist: String ->
      startService(PlaybackForegroundService.ACTION_UPDATE, title, artist)
    }

    Function("stop") {
      try {
        context.stopService(Intent(context, PlaybackForegroundService::class.java))
      } catch (e: Exception) {
        Log.w("BloopForeground", "stopService failed", e)
      }
    }
  }

  private fun startService(action: String, title: String, artist: String) {
    val intent = Intent(context, PlaybackForegroundService::class.java).apply {
      this.action = action
      putExtra(PlaybackForegroundService.EXTRA_TITLE, title)
      putExtra(PlaybackForegroundService.EXTRA_ARTIST, artist)
    }
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    } catch (e: Exception) {
      // e.g. ForegroundServiceStartNotAllowedException when called from background.
      Log.w("BloopForeground", "startForegroundService failed", e)
    }
  }
}
