FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY Csmas.Api/*.csproj Csmas.Api/
RUN dotnet restore Csmas.Api/Csmas.Api.csproj
COPY Csmas.Api/ Csmas.Api/
RUN dotnet publish Csmas.Api/Csmas.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "Csmas.Api.dll"]
