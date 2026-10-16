using System.Security.Cryptography;
using System.Xml.Linq;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Sift.Api.Infrastructure.Security;

namespace Sift.Api.Tests;

public sealed class KeyRingEncryptionTests
{
    private static readonly XElement KeyElement =
        XElement.Parse("<key id=\"1\"><descriptor><masterKey><value>c2VjcmV0LWtleS1tYXRlcmlhbA==</value></masterKey></descriptor></key>");

    private static AesGcmXmlDecryptor DecryptorWith(string base64Key)
    {
        var services = new ServiceCollection()
            .AddSingleton(Options.Create(new KeyRingEncryptionOptions { KeyEncryptionKey = base64Key }))
            .BuildServiceProvider();
        return new AesGcmXmlDecryptor(services);
    }

    private static readonly string Key = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

    private static XElement Encrypt(XElement element)
    {
        new KeyRingEncryptionOptions { KeyEncryptionKey = Key }.TryGetKey(out var key);
        var info = new AesGcmXmlEncryptor(key).Encrypt(element);
        Assert.Equal(typeof(AesGcmXmlDecryptor), info.DecryptorType);
        return info.EncryptedElement;
    }

    [Fact]
    public void Round_trips_and_never_stores_the_plaintext()
    {
        var encrypted = Encrypt(KeyElement);

        Assert.DoesNotContain("c2VjcmV0LWtleS1tYXRlcmlhbA", encrypted.ToString());
        Assert.Equal(KeyElement.ToString(), DecryptorWith(Key).Decrypt(encrypted).ToString());
    }

    [Fact]
    public void Each_encryption_uses_a_fresh_nonce() =>
        Assert.NotEqual((string?)Encrypt(KeyElement).Element("nonce"), (string?)Encrypt(KeyElement).Element("nonce"));

    [Fact]
    public void A_tampered_entry_is_rejected()
    {
        var encrypted = Encrypt(KeyElement);
        var value = Convert.FromBase64String((string)encrypted.Element("value")!);
        value[0] ^= 1;
        encrypted.Element("value")!.Value = Convert.ToBase64String(value);

        Assert.ThrowsAny<CryptographicException>(() => DecryptorWith(Key).Decrypt(encrypted));
    }

    [Fact]
    public void The_wrong_key_is_rejected() =>
        Assert.ThrowsAny<CryptographicException>(() =>
            DecryptorWith(Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))).Decrypt(Encrypt(KeyElement)));

    [Theory]
    [InlineData("not base64!")]
    [InlineData("c2hvcnQ=")]
    public void Keys_that_are_not_32_bytes_of_base64_are_invalid(string value) =>
        Assert.False(new KeyRingEncryptionOptions { KeyEncryptionKey = value }.IsValid);
}
