using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using typerace.Hub;
using typerace.Service;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .AllowAnyOrigin()      // ✅ allow requests from any domain
            .AllowAnyHeader()      // allow any headers
            .AllowAnyMethod();     // allow GET, POST, OPTIONS, etc.
    });
});

// Add SignalR
builder.Services.AddSignalR();

// Add services
builder.Services.AddSingleton<RoomService>();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
  
}

//app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthorization();
app.UseCors();
app.MapControllers();
app.MapHub<TypeRaceHub>("/typeracehub");

// Serve index.html as default page
app.MapFallbackToFile("index.html");

app.Run();
