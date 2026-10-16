using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;
using Microsoft.AspNetCore.DataProtection.XmlEncryption;
using Microsoft.Extensions.Options;

namespace Sift.Api.Infrastructure.Security;

/// <summary>
/// Bound from "DataProtection". The key-encryption key wraps the cookie-encryption keys that ASP.NET
/// Core keeps in the data_protection_keys table, so a copy of the database alone can't forge a
/// session. It lives only in the host's secrets (DataProtection__KeyEncryptionKey), never in Postgres.
/// </summary>
public sealed class KeyRingEncryptionOptions
{
    public const string SectionName = "DataProtection";

    /// <summary>32 random bytes, base64. Generate with: openssl rand -base64 32</summary>
    public string KeyEncryptionKey { get; init; } = string.Empty;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(KeyEncryptionKey);

    public bool IsValid => !IsConfigured || TryGetKey(out _);

    public bool TryGetKey(out byte[] key)
    {
        try
        {
            key = Convert.FromBase64String(KeyEncryptionKey.Trim());
            return key.Length == 32;
        }
        catch (FormatException)
        {
            key = [];
            return false;
        }
    }
}

/// <summary>Encrypts each key-ring entry with AES-256-GCM (random nonce, authenticated) before it's stored.</summary>
public sealed class AesGcmXmlEncryptor(byte[] key) : IXmlEncryptor
{
    internal const int NonceSize = 12;
    internal const int TagSize = 16;
    internal static readonly byte[] AssociatedData = "Sift.DataProtection.KeyRing.v1"u8.ToArray();

    public EncryptedXmlInfo Encrypt(XElement plaintextElement)
    {
        var plaintext = Encoding.UTF8.GetBytes(plaintextElement.ToString(SaveOptions.DisableFormatting));
        var nonce = RandomNumberGenerator.GetBytes(NonceSize);
        var ciphertext = new byte[plaintext.Length];
        var tag = new byte[TagSize];
        try
        {
            using var aes = new AesGcm(key, TagSize);
            aes.Encrypt(nonce, plaintext, ciphertext, tag, AssociatedData);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(plaintext);
        }

        var element = new XElement("encryptedKey",
            new XAttribute("algorithm", "AES-256-GCM"),
            new XElement("nonce", Convert.ToBase64String(nonce)),
            new XElement("tag", Convert.ToBase64String(tag)),
            new XElement("value", Convert.ToBase64String(ciphertext)));
        return new EncryptedXmlInfo(element, typeof(AesGcmXmlDecryptor));
    }
}

/// <summary>
/// Created by ASP.NET Core's activator (hence the IServiceProvider constructor) when it reads an
/// entry written by <see cref="AesGcmXmlEncryptor"/>. A wrong key or tampered entry throws.
/// </summary>
public sealed class AesGcmXmlDecryptor(IServiceProvider services) : IXmlDecryptor
{
    public XElement Decrypt(XElement encryptedElement)
    {
        if (!services.GetRequiredService<IOptions<KeyRingEncryptionOptions>>().Value.TryGetKey(out var key))
        {
            throw new CryptographicException(
                "A data protection key is encrypted, but DataProtection:KeyEncryptionKey isn't set or isn't 32 bytes of base64.");
        }

        var nonce = Convert.FromBase64String((string?)encryptedElement.Element("nonce") ?? "");
        var tag = Convert.FromBase64String((string?)encryptedElement.Element("tag") ?? "");
        var ciphertext = Convert.FromBase64String((string?)encryptedElement.Element("value") ?? "");
        if (nonce.Length != AesGcmXmlEncryptor.NonceSize || tag.Length != AesGcmXmlEncryptor.TagSize)
        {
            throw new CryptographicException("The encrypted data protection key is malformed.");
        }

        var plaintext = new byte[ciphertext.Length];
        try
        {
            using var aes = new AesGcm(key, AesGcmXmlEncryptor.TagSize);
            aes.Decrypt(nonce, ciphertext, tag, plaintext, AesGcmXmlEncryptor.AssociatedData);
            return XElement.Parse(Encoding.UTF8.GetString(plaintext));
        }
        finally
        {
            CryptographicOperations.ZeroMemory(plaintext);
            CryptographicOperations.ZeroMemory(key);
        }
    }
}
