import unittest

from verify_apk import has_verified_modern_signature, validate_release_metadata


class ReleaseMetadataTest(unittest.TestCase):
    def test_android_9_v3_verification_is_accepted_when_v2_is_not_selected(self):
        signature = "Verified using v2 scheme (APK Signature Scheme v2): false\nVerified using v3 scheme (APK Signature Scheme v3): true\n"
        self.assertTrue(has_verified_modern_signature(signature))

    def test_unverified_signature_schemes_are_rejected(self):
        signature = "Verified using v2 scheme (APK Signature Scheme v2): false\nVerified using v3 scheme (APK Signature Scheme v3): false\n"
        self.assertFalse(has_verified_modern_signature(signature))

    def test_debuggable_application_is_rejected_even_with_release_certificate(self):
        with self.assertRaisesRegex(ValueError, "debuggable"):
            validate_release_metadata("package: name='io.moducabin.demo'\napplication-debuggable\n", "Signer #1 certificate DN: CN=Modu Cabin Submission")

    def test_android_debug_certificate_is_rejected_even_when_debuggable_is_false(self):
        with self.assertRaisesRegex(ValueError, "debug certificate"):
            validate_release_metadata("package: name='io.moducabin.demo'\n", "Signer #1 certificate DN: C=US, O=Android, CN=Android Debug")

    def test_non_debug_application_and_submission_certificate_are_accepted(self):
        validate_release_metadata("package: name='io.moducabin.demo'\n", "Signer #1 certificate DN: CN=Modu Cabin Submission, O=Modu Cabin Prototype, C=KR")


if __name__ == "__main__":
    unittest.main()
