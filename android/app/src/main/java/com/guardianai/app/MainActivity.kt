package com.guardianai.app

import android.app.Activity
import android.app.role.RoleManager
import android.graphics.Color
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

class MainActivity : Activity() {
    private lateinit var roleStatus: TextView
    private lateinit var roleButton: Button
    private lateinit var listContainer: LinearLayout
    private lateinit var numberInput: EditText

    private val blue = Color.rgb(37, 99, 235)
    private val dark = Color.rgb(17, 24, 39)
    private val muted = Color.rgb(107, 114, 128)
    private val border = Color.rgb(229, 231, 235)
    private val surface = Color.WHITE

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        buildScreen()
        refreshScreeningStatus()
        renderBlocklist()
    }

    override fun onResume() {
        super.onResume()
        if (::roleStatus.isInitialized) refreshScreeningStatus()
        if (::listContainer.isInitialized) renderBlocklist()
    }

    @Deprecated("Use the Android system role prompt result; this callback remains supported.")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == ROLE_REQUEST) refreshScreeningStatus()
    }

    private fun buildScreen() {
        window.statusBarColor = Color.rgb(248, 249, 250)
        window.navigationBarColor = Color.rgb(248, 249, 250)
        window.decorView.systemUiVisibility =
            View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR

        val scroll = ScrollView(this).apply {
            setFillViewport(true)
            setBackgroundColor(Color.rgb(248, 249, 250))
        }
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(32), dp(24), dp(36))
        }
        scroll.addView(content)
        setContentView(scroll)

        content.addView(label("GUARDIAN AI", 12f, blue, true))
        content.addView(spacer(8))
        content.addView(label("Android call screening", 26f, dark, true))
        content.addView(spacer(8))
        content.addView(label(
            "A local caller blocklist controlled by you. Guardian only rejects numbers you explicitly add.",
            14f, muted, false
        ))
        content.addView(spacer(24))

        val statusCard = card()
        statusCard.addView(label("SYSTEM PERMISSION", 10f, muted, true))
        statusCard.addView(spacer(8))
        roleStatus = label("", 15f, dark, true)
        statusCard.addView(roleStatus)
        statusCard.addView(spacer(12))
        roleButton = Button(this).apply {
            text = "Enable Android call screening"
            setOnClickListener { requestScreeningRole() }
        }
        statusCard.addView(roleButton)
        content.addView(statusCard)
        content.addView(spacer(18))

        val warning = card()
        warning.setBackgroundColor(Color.rgb(239, 246, 255))
        warning.addView(label("IMPORTANT LIMIT", 10f, blue, true))
        warning.addView(spacer(6))
        warning.addView(label(
            "Android provides caller metadata to this service, not the cellular call's audio. This companion cannot detect a deepfake voice during a live phone call. Use the web app to submit an audio sample for Gemini-assisted screening.",
            13f, dark, false
        ))
        content.addView(warning)
        content.addView(spacer(24))

        content.addView(label("LOCAL BLOCKLIST", 16f, dark, true))
        content.addView(spacer(6))
        content.addView(label(
            "Only exact normalized number matches are rejected. Unlisted, private, and unknown numbers are allowed.",
            13f, muted, false
        ))
        content.addView(spacer(12))

        val inputRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        numberInput = EditText(this).apply {
            hint = "+919876543210"
            inputType = InputType.TYPE_CLASS_PHONE
            singleLine = true
            textSize = 15f
            setPadding(dp(12), dp(10), dp(12), dp(10))
            background = android.graphics.drawable.GradientDrawable().apply {
                setColor(surface)
                setStroke(dp(1), border)
                cornerRadius = dp(10).toFloat()
            }
        }
        inputRow.addView(numberInput, LinearLayout.LayoutParams(0, dp(52), 1f))
        val addButton = Button(this).apply {
            text = "Add"
            setOnClickListener { addNumber() }
        }
        val addParams = LinearLayout.LayoutParams(dp(88), dp(52)).apply {
            marginStart = dp(8)
        }
        inputRow.addView(addButton, addParams)
        content.addView(inputRow)
        content.addView(spacer(16))

        listContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        content.addView(listContainer)
        content.addView(spacer(20))
        content.addView(label(
            "Privacy: numbers are stored only in this app's local preferences. This module does not upload your blocklist or read your contacts or call log.",
            12f, muted, false
        ))
    }

    private fun refreshScreeningStatus() {
        val roleManager = getSystemService(RoleManager::class.java)
        val available = roleManager?.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING) == true
        val enabled = available && roleManager.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)

        roleStatus.text = when {
            !available -> "This device does not offer Android call screening."
            enabled -> "Enabled. Android will ask Guardian to screen incoming calls."
            else -> "Not enabled. Android has not granted Guardian the screening role."
        }
        roleButton.text = when {
            !available -> "Unavailable on this device"
            enabled -> "Call screening enabled"
            else -> "Enable Android call screening"
        }
        roleButton.isEnabled = available && !enabled
    }

    private fun requestScreeningRole() {
        val roleManager = getSystemService(RoleManager::class.java)
        if (roleManager == null || !roleManager.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING)) {
            Toast.makeText(this, "Call screening is not available on this device.", Toast.LENGTH_LONG).show()
            return
        }
        if (roleManager.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)) {
            refreshScreeningStatus()
            return
        }
        try {
            startActivityForResult(
                roleManager.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING),
                ROLE_REQUEST
            )
        } catch (_: Exception) {
            Toast.makeText(this, "Android could not open the call-screening permission prompt.", Toast.LENGTH_LONG).show()
        }
    }

    private fun addNumber() {
        val raw = numberInput.text?.toString().orEmpty()
        if (!PhoneNumberNormalizer.isValid(raw)) {
            Toast.makeText(this, "Enter a phone number with 7 to 15 digits.", Toast.LENGTH_LONG).show()
            return
        }
        val normalized = PhoneNumberNormalizer.normalize(raw)
        val added = BlocklistStore.add(this, normalized)
        if (added) {
            numberInput.text?.clear()
            Toast.makeText(this, "Number added to your local blocklist.", Toast.LENGTH_SHORT).show()
            renderBlocklist()
        } else {
            Toast.makeText(this, "That number is already on your blocklist.", Toast.LENGTH_SHORT).show()
        }
    }

    private fun renderBlocklist() {
        if (!::listContainer.isInitialized) return
        listContainer.removeAllViews()
        val numbers = BlocklistStore.getBlockedNumbers(this).sorted()
        if (numbers.isEmpty()) {
            val empty = card()
            empty.addView(label("Your blocklist is empty.", 14f, muted, false))
            listContainer.addView(empty)
            return
        }

        numbers.forEach { number ->
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(12), dp(8), dp(8), dp(8))
                background = android.graphics.drawable.GradientDrawable().apply {
                    setColor(surface)
                    setStroke(dp(1), border)
                    cornerRadius = dp(10).toFloat()
                }
            }
            row.addView(label(number, 14f, dark, true), LinearLayout.LayoutParams(0, dp(48), 1f))
            val remove = Button(this).apply {
                text = "Remove"
                textSize = 11f
                setOnClickListener {
                    BlocklistStore.remove(this@MainActivity, number)
                    renderBlocklist()
                }
            }
            row.addView(remove, LinearLayout.LayoutParams(dp(92), dp(44)))
            val params = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = dp(8)
            }
            listContainer.addView(row, params)
        }
    }

    private fun card(): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(16), dp(16), dp(16))
            background = android.graphics.drawable.GradientDrawable().apply {
                setColor(surface)
                setStroke(dp(1), border)
                cornerRadius = dp(14).toFloat()
            }
        }
    }

    private fun label(text: String, size: Float, color: Int, bold: Boolean): TextView {
        return TextView(this).apply {
            this.text = text
            textSize = size
            setTextColor(color)
            if (bold) setTypeface(typeface, android.graphics.Typeface.BOLD)
        }
    }

    private fun spacer(heightDp: Int): View = View(this).apply {
        layoutParams = LinearLayout.LayoutParams(1, dp(heightDp))
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    companion object {
        private const val ROLE_REQUEST = 501
    }
}
