using System.ComponentModel.DataAnnotations;
using Sift.Api.Domain.Entities;

namespace Sift.Api.Contracts.Requests;

/// <summary>An empty or missing alias shows the profile's Steam name instead.</summary>
public sealed record SaveFavouriteRequest([StringLength(FavouriteProfile.AliasMaxLength)] string? Alias);
