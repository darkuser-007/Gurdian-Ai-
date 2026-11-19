package com.guardianai.app

import android.app.Activity
import android.app.AlertDialog
import android.app.role.RoleManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.WindowInsets
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

/**
 * Native Android companion for Guardian AI.
 * Screens caller metadata against a user-managed local blocklist.
 * Android does not expose cellular call audio to CallScreeningService.
 */
class MainActivity : Activity() {
    private lateinit var roleStatus: TextView
    private lateinit var roleButton: Button
    private lateinit var listContainer: LinearLayout
    private lateinit var numberInput: EditText
    private lateinit var searchInput: EditText
    private lateinit var countLabel: TextView

    private val ink = Color.rgb(11, 31, 42)
    private val muted = Color.rgb(91, 112, 120)
    private val teal = Color.rgb(15, 118, 110)
    private val background = Color.rgb(244, 248, 247)
    private val surface = Color.WHITE
    private val border = Color.rgb(224, 235, 232)
    private val paleMint = Color.rgb(230, 247, 243)
    private val paleAmber = Color.rgb(255, 247, 230)
    private val amber = Color.rgb(146, 93, 16)
    private val danger = Color.rgb(185, 55, 55)

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

    @Deprecated("Kept for compatibility with the Android role request flow.")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == ROLE_REQUEST) refreshScreeningStatus()
    }

    private fun buildScreen() {
        window.statusBarColor = background
        window.navigationBarColor = background
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        } else {
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
        }

        val scroll = ScrollView(this).apply {
            setFillViewport(true)
            clipToPadding = false
            setBackgroundColor(background)
            isVerticalScrollBarEnabled = false
        }
        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(18), dp(20), dp(28))
        }
        scroll.addView(content)
        setContentView(scroll)

        // Respect system bars on Android 15+ edge-to-edge devices.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            scroll.setOnApplyWindowInsetsListener { view, insets ->
                val top = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    insets.getInsets(WindowInsets.Type.statusBars()).top
                } else {
                    @Suppress("DEPRECATION")
                    insets.systemWindowInsetTop
                }
                val bottom = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    insets.getInsets(WindowInsets.Type.navigationBars()).bottom
                } else {
                    @Suppress("DEPRECATION")
                    insets.systemWindowInsetBottom
                }
                view.setPadding(dp(20), top + dp(12), dp(20), bottom + dp(20))
                insets
            }
            scroll.requestApplyInsets()
        }

        val brandRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val brandMark = TextView(this).apply {
            text = "G"
            textSize = 21f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            typeface = Typeface.DEFAULT_BOLD
            background = rounded(teal, teal, 16)
            contentDescription = "Guardian AI logo"
        }
        brandRow.addView(brandMark, LinearLayout.LayoutParams(dp(44), dp(44)))
        val brandText = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(11), 0, 0, 0)
        }
        brandText.addView(label("GUARDIAN AI", 13f, ink, true))
        brandText.addView(label("VOICE SAFETY COMPANION", 10f, muted, true))
        brandRow.addView(brandText)
        content.addView(brandRow)
        content.addView(space(24))

        content.addView(label("Your call protection", 27f, ink, true))
        content.addView(space(7))
        content.addView(label(
            "Manage the numbers you want Android to reject. Your list stays on this device.",
            14f, muted, false
        ))
        content.addView(space(20))

        val statusCard = card(padding = 18)
        val statusHeader = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        statusHeader.addView(label("ANDROID SCREENING", 11f, teal, true),
            LinearLayout.LayoutParams(0, dp(24), 1f))
        val statusPill = label("SYSTEM ROLE", 9f, teal, true).apply {
            setPadding(dp(9), dp(6), dp(9), dp(6))
            background = rounded(paleMint, paleMint, 30)
        }
        statusHeader.addView(statusPill)
        statusCard.addView(statusHeader)
        statusCard.addView(space(10))
        roleStatus = label("", 15f, ink, true)
        roleStatus.setLineSpacing(dp(3).toFloat(), 1f)
        statusCard.addView(roleStatus)
        statusCard.addView(space(14))
        roleButton = actionButton("Enable call screening")
        roleButton.setOnClickListener { requestScreeningRole() }
        statusCard.addView(roleButton, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, dp(50)
        ))
        content.addView(statusCard)
        content.addView(space(14))

        val infoCard = card(padding = 15).apply {
            background = rounded(paleAmber, paleAmber, 16)
        }
        infoCard.addView(label("WHAT THIS ANDROID APP DOES", 10f, amber, true))
        infoCard.addView(space(6))
        infoCard.addView(label(
            "It checks incoming caller ID against your own blocklist. Android does not provide the cellular call's audio to this service, so this app cannot detect a deepfake voice during a live call.",
            13f, ink, false
        ))
        content.addView(infoCard)
        content.addView(space(24))

        val listHeading = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val headingStack = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        headingStack.addView(label("Your blocklist", 19f, ink, true))
        countLabel = label("0 saved numbers", 12f, muted, false)
        headingStack.addView(countLabel)
        listHeading.addView(headingStack, LinearLayout.LayoutParams(0, -2, 1f))
        val clearButton = textButton("Clear all", danger)
        clearButton.setOnClickListener { confirmClearAll() }
        listHeading.addView(clearButton)
        content.addView(listHeading)
        content.addView(space(12))

        val inputCard = card(padding = 14)
        inputCard.addView(label("ADD A NUMBER", 10f, teal, true))
        inputCard.addView(space(9))
        numberInput = EditText(this).apply {
            hint = "+91 98765 43210"
            inputType = InputType.TYPE_CLASS_PHONE
            imeOptions = EditorInfo.IME_ACTION_DONE
            setSingleLine(true)
            textSize = 16f
            setTextColor(ink)
            setHintTextColor(Color.rgb(150, 166, 166))
            setPadding(dp(14), dp(12), dp(14), dp(12))
            background = rounded(surface, border, 12)
            contentDescription = "Phone number to add to blocklist"
            setOnEditorActionListener { _, actionId, _ ->
                if (actionId == EditorInfo.IME_ACTION_DONE) {
                    addNumber()
                    true
                } else false
            }
        }
        inputCard.addView(numberInput, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, dp(52)
        ))
        inputCard.addView(space(9))
        val addButton = actionButton("＋  Add to blocklist")
        addButton.setOnClickListener { addNumber() }
        inputCard.addView(addButton, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, dp(50)
        ))
        content.addView(inputCard)
        content.addView(space(12))

        searchInput = EditText(this).apply {
            hint = "Search saved numbers"
            inputType = InputType.TYPE_CLASS_PHONE
            setSingleLine(true)
            textSize = 14f
            setTextColor(ink)
            setHintTextColor(Color.rgb(150, 166, 166))
            setPadding(dp(14), dp(10), dp(14), dp(10))
            background = rounded(surface, border, 12)
            contentDescription = "Search blocklist"
            addTextChangedListener(SimpleTextWatcher { renderBlocklist() })
        }
        content.addView(searchInput, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, dp(48)
        ))
        content.addView(space(10))

        listContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        content.addView(listContainer)
        content.addView(space(18))
        content.addView(label(
            "PRIVACY FIRST  •  Stored locally on this device. Guardian does not upload this list or read your contacts or call log.",
            11f, muted, false
        ))
    }

    private fun refreshScreeningStatus() {
        val roleManager = getSystemService(RoleManager::class.java)
        val available = roleManager?.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING) == true
        val enabled = available && roleManager?.isRoleHeld(RoleManager.ROLE_CALL_SCREENING) == true

        roleStatus.text = when {
            !available -> "Call screening is not available on this device."
            enabled -> "Protection is enabled. Android will send incoming caller details to Guardian."
            else -> "Not active yet. Allow Guardian in Android's system permission prompt."
        }
        roleButton.text = when {
            !available -> "Not available on this device"
            enabled -> "✓  Call screening is enabled"
            else -> "Enable Android call screening"
        }
        roleButton.isEnabled = available && !enabled
        roleButton.alpha = if (roleButton.isEnabled) 1f else 0.72f
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
            Toast.makeText(this, "Android could not open the permission prompt.", Toast.LENGTH_LONG).show()
        }
    }

    private fun addNumber() {
        val raw = numberInput.text?.toString().orEmpty().trim()
        if (!PhoneNumberNormalizer.isValid(raw)) {
            numberInput.error = "Enter a valid number with 7–15 digits"
            numberInput.requestFocus()
            return
        }
        val normalized = PhoneNumberNormalizer.normalize(raw)
        if (BlocklistStore.add(this, normalized)) {
            numberInput.text?.clear()
            numberInput.error = null
            searchInput.text?.clear()
            Toast.makeText(this, "Number added to your blocklist.", Toast.LENGTH_SHORT).show()
            renderBlocklist()
        } else {
            numberInput.error = "This number is already saved"
        }
    }

    private fun renderBlocklist() {
        if (!::listContainer.isInitialized) return
        listContainer.removeAllViews()
        val allNumbers = BlocklistStore.getBlockedNumbers(this).sorted()
        countLabel.text = if (allNumbers.size == 1) "1 saved number" else "${allNumbers.size} saved numbers"
        val query = if (::searchInput.isInitialized) searchInput.text?.toString()?.trim().orEmpty() else ""
        val numbers = allNumbers.filter { it.contains(query, ignoreCase = true) }

        if (allNumbers.isEmpty()) {
            val empty = card(padding = 20)
            empty.gravity = Gravity.CENTER
            empty.addView(label("No blocked numbers yet", 15f, ink, true))
            empty.addView(space(5))
            empty.addView(label("Add a number above to build your personal blocklist.", 13f, muted, false))
            listContainer.addView(empty)
            return
        }
        if (numbers.isEmpty()) {
            val empty = card(padding = 18)
            empty.addView(label("No matching numbers", 14f, ink, true))
            empty.addView(label("Try another search.", 12f, muted, false))
            listContainer.addView(empty)
            return
        }

        numbers.forEach { number ->
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(13), dp(10), dp(8), dp(10))
                background = rounded(surface, border, 14)
            }
            val details = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
            details.addView(label(number, 15f, ink, true))
            details.addView(label("Exact caller ID match", 11f, muted, false))
            row.addView(details, LinearLayout.LayoutParams(0, -2, 1f))
            val remove = textButton("Remove", danger)
            remove.setOnClickListener { confirmRemove(number) }
            row.addView(remove, LinearLayout.LayoutParams(dp(88), dp(42)))
            val params = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(8) }
            listContainer.addView(row, params)
        }
    }

    private fun confirmRemove(number: String) {
        AlertDialog.Builder(this)
            .setTitle("Remove this number?")
            .setMessage("$number will no longer be blocked by Guardian.")
            .setNegativeButton("Keep", null)
            .setPositiveButton("Remove") { _, _ ->
                BlocklistStore.remove(this, number)
                renderBlocklist()
                Toast.makeText(this, "Number removed.", Toast.LENGTH_SHORT).show()
            }
            .show()
    }

    private fun confirmClearAll() {
        val count = BlocklistStore.getBlockedNumbers(this).size
        if (count == 0) {
            Toast.makeText(this, "Your blocklist is already empty.", Toast.LENGTH_SHORT).show()
            return
        }
        AlertDialog.Builder(this)
            .setTitle("Clear your blocklist?")
            .setMessage("This removes all $count saved numbers. Incoming calls will no longer be rejected by this list.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Clear all") { _, _ ->
                BlocklistStore.clear(this)
                searchInput.text?.clear()
                renderBlocklist()
                Toast.makeText(this, "Blocklist cleared.", Toast.LENGTH_SHORT).show()
            }
            .show()
    }

    private fun card(padding: Int): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(padding), dp(padding), dp(padding), dp(padding))
        background = rounded(surface, border, 18)
        elevation = dp(1).toFloat()
    }

    private fun label(text: String, size: Float, color: Int, bold: Boolean): TextView =
        TextView(this).apply {
            this.text = text
            textSize = size
            setTextColor(color)
            if (bold) setTypeface(typeface, Typeface.BOLD)
            setLineSpacing(dp(2).toFloat(), 1f)
        }

    private fun actionButton(textValue: String): Button = Button(this).apply {
        text = textValue
        textSize = 14f
        isAllCaps = false
        typeface = Typeface.DEFAULT_BOLD
        setTextColor(Color.WHITE)
        background = rounded(teal, teal, 14)
        minHeight = dp(48)
        stateListAnimator = null
        contentDescription = textValue
    }

    private fun textButton(textValue: String, color: Int): Button = Button(this).apply {
        text = textValue
        textSize = 12f
        isAllCaps = false
        typeface = Typeface.DEFAULT_BOLD
        setTextColor(color)
        background = rounded(Color.rgb(248, 251, 250), border, 12)
        minHeight = dp(42)
        stateListAnimator = null
    }

    private fun rounded(fill: Int, stroke: Int, radius: Int): GradientDrawable =
        GradientDrawable().apply {
            setColor(fill)
            setStroke(dp(1), stroke)
            cornerRadius = dp(radius).toFloat()
        }

    private fun space(heightDp: Int): View = View(this).apply {
        layoutParams = LinearLayout.LayoutParams(1, dp(heightDp))
    }

    private fun dp(value: Int): Int =
        (value * resources.displayMetrics.density).toInt()

    companion object {
        private const val ROLE_REQUEST = 501
    }
}

/** Small text listener without adding an AndroidX dependency. */
private class SimpleTextWatcher(private val onChanged: () -> Unit) :
    android.text.TextWatcher {
    override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
    override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = onChanged()
    override fun afterTextChanged(s: android.text.Editable?) = Unit
}
