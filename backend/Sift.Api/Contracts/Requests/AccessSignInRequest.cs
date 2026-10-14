using System.ComponentModel.DataAnnotations;

namespace Sift.Api.Contracts.Requests;

public sealed record AccessSignInRequest([Required, MaxLength(200)] string Password);
