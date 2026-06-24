namespace Csmas.Api.Services;

/// <summary>
/// Server-side distance check for the attendance geo-fence rule — the phone's own GPS reading is
/// trusted, but whether that position counts as "close enough" is always decided here, never on
/// the client.
/// </summary>
public static class GeoService
{
    private const double EarthRadiusMeters = 6_371_000;

    public static double DistanceMeters(decimal lat1, decimal lng1, decimal lat2, decimal lng2)
    {
        var phi1 = ToRadians((double)lat1);
        var phi2 = ToRadians((double)lat2);
        var deltaPhi = ToRadians((double)(lat2 - lat1));
        var deltaLambda = ToRadians((double)(lng2 - lng1));

        var a = Math.Sin(deltaPhi / 2) * Math.Sin(deltaPhi / 2)
                + Math.Cos(phi1) * Math.Cos(phi2) * Math.Sin(deltaLambda / 2) * Math.Sin(deltaLambda / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        return EarthRadiusMeters * c;
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180.0;
}
