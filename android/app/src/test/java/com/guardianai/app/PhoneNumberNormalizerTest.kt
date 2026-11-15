package com.guardianai.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PhoneNumberNormalizerTest {
    @Test
    fun normalizesSeparatorsWithoutChangingCountryPrefix() {
        assertEquals("+919876543210", PhoneNumberNormalizer.normalize("+91 98765-43210"))
        assertEquals("02012345678", PhoneNumberNormalizer.normalize("(020) 1234 5678"))
    }

    @Test
    fun acceptsPlausiblePhoneNumberLengths() {
        assertTrue(PhoneNumberNormalizer.isValid("+919876543210"))
        assertTrue(PhoneNumberNormalizer.isValid("02012345678"))
        assertFalse(PhoneNumberNormalizer.isValid("12345"))
        assertFalse(PhoneNumberNormalizer.isValid("1234567890123456"))
    }

    @Test
    fun matchingIsExactAfterRemovingFormatting() {
        assertTrue(PhoneNumberNormalizer.matches("+91 98765 43210", "+919876543210"))
        assertFalse(PhoneNumberNormalizer.matches("+91 98765 43210", "9876543210"))
        assertFalse(PhoneNumberNormalizer.matches("9876543210", "9876543211"))
    }

    @Test
    fun invalidNumbersNeverMatch() {
        assertFalse(PhoneNumberNormalizer.matches("private", "private"))
        assertFalse(PhoneNumberNormalizer.matches("12345", "12345"))
    }
}
