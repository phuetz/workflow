/**
 * Workflow Desktop Application - Windows Native (WPF)
 * High-performance native Windows application with modern UI
 */

using System;
using System.Windows;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using WorkflowApp.Services;
using WorkflowApp.ViewModels;
using WorkflowApp.Views;
using Serilog;
using Hardcodet.Wpf.TaskbarNotification;
using Windows.UI.Notifications;

namespace WorkflowApp
{
    /// <summary>
    /// Main application class
    /// </summary>
    public partial class App : Application
    {
        private IHost _host;
        private TaskbarIcon _notifyIcon;
        private Mutex _mutex;

        protected override async void OnStartup(StartupEventArgs e)
        {
            // Check for single instance
            bool isNewInstance;
            _mutex = new Mutex(true, "WorkflowPlatformDesktop", out isNewInstance);
            
            if (!isNewInstance)
            {
                MessageBox.Show("Application is already running.", "Workflow Platform", 
                    MessageBoxButton.OK, MessageBoxImage.Information);
                Shutdown();
                return;
            }

            // Configure logging
            Log.Logger = new LoggerConfiguration()
                .MinimumLevel.Debug()
                .WriteTo.File("logs/workflow-.log", rollingInterval: RollingInterval.Day)
                .WriteTo.Debug()
                .CreateLogger();

            // Build host
            _host = Host.CreateDefaultBuilder(e.Args)
                .UseSerilog()
                .ConfigureServices((context, services) =>
                {
                    // Register services
                    services.AddSingleton<IAuthenticationService, AuthenticationService>();
                    services.AddSingleton<IWorkflowService, WorkflowService>();
                    services.AddSingleton<IExecutionService, ExecutionService>();
                    services.AddSingleton<IWebSocketService, WebSocketService>();
                    services.AddSingleton<ISettingsService, SettingsService>();
                    services.AddSingleton<INotificationService, NotificationService>();
                    services.AddSingleton<IEncryptionService, EncryptionService>();
                    services.AddSingleton<ISystemService, SystemService>();
                    services.AddSingleton<IUpdateService, UpdateService>();
                    
                    // Register ViewModels
                    services.AddTransient<MainViewModel>();
                    services.AddTransient<LoginViewModel>();
                    services.AddTransient<DashboardViewModel>();
                    services.AddTransient<WorkflowEditorViewModel>();
                    services.AddTransient<ExecutionViewModel>();
                    services.AddTransient<SettingsViewModel>();
                    
                    // Register Views
                    services.AddSingleton<MainWindow>();
                    services.AddTransient<LoginWindow>();
                    services.AddTransient<WorkflowEditorWindow>();
                })
                .Build();

            await _host.StartAsync();

            // Initialize system tray
            InitializeSystemTray();

            // Check for updates
            var updateService = _host.Services.GetRequiredService<IUpdateService>();
            _ = Task.Run(async () => await updateService.CheckForUpdatesAsync());

            // Show main window or login
            var authService = _host.Services.GetRequiredService<IAuthenticationService>();
            if (await authService.IsAuthenticatedAsync())
            {
                ShowMainWindow();
            }
            else
            {
                ShowLoginWindow();
            }

            base.OnStartup(e);
        }

        protected override async void OnExit(ExitEventArgs e)
        {
            _notifyIcon?.Dispose();
            _mutex?.ReleaseMutex();
            
            using (_host)
            {
                await _host.StopAsync(TimeSpan.FromSeconds(5));
            }
            
            Log.CloseAndFlush();
            base.OnExit(e);
        }

        private void InitializeSystemTray()
        {
            _notifyIcon = new TaskbarIcon
            {
                Icon = WorkflowApp.Properties.Resources.TrayIcon,
                ToolTipText = "Workflow Platform",
                ContextMenu = CreateTrayMenu()
            };

            _notifyIcon.TrayMouseDoubleClick += (s, e) => ShowMainWindow();
        }

        private ContextMenu CreateTrayMenu()
        {
            var menu = new ContextMenu();
            
            menu.Items.Add(new MenuItem 
            { 
                Header = "Show", 
                Command = new RelayCommand(_ => ShowMainWindow()) 
            });
            
            menu.Items.Add(new MenuItem 
            { 
                Header = "Create Workflow", 
                Command = new RelayCommand(_ => CreateNewWorkflow()) 
            });
            
            menu.Items.Add(new Separator());
            
            menu.Items.Add(new MenuItem 
            { 
                Header = "Settings", 
                Command = new RelayCommand(_ => ShowSettings()) 
            });
            
            menu.Items.Add(new Separator());
            
            menu.Items.Add(new MenuItem 
            { 
                Header = "Exit", 
                Command = new RelayCommand(_ => Shutdown()) 
            });
            
            return menu;
        }

        private void ShowMainWindow()
        {
            var mainWindow = _host.Services.GetRequiredService<MainWindow>();
            if (!mainWindow.IsVisible)
            {
                mainWindow.Show();
            }
            
            if (mainWindow.WindowState == WindowState.Minimized)
            {
                mainWindow.WindowState = WindowState.Normal;
            }
            
            mainWindow.Activate();
            mainWindow.Topmost = true;
            mainWindow.Topmost = false;
            mainWindow.Focus();
        }

        private void ShowLoginWindow()
        {
            var loginWindow = new LoginWindow
            {
                DataContext = _host.Services.GetRequiredService<LoginViewModel>()
            };
            
            loginWindow.ShowDialog();
            
            if (loginWindow.DialogResult == true)
            {
                ShowMainWindow();
            }
            else
            {
                Shutdown();
            }
        }

        private void CreateNewWorkflow()
        {
            var mainWindow = _host.Services.GetRequiredService<MainWindow>();
            mainWindow.CreateNewWorkflow();
        }

        private void ShowSettings()
        {
            var mainWindow = _host.Services.GetRequiredService<MainWindow>();
            mainWindow.ShowSettings();
        }

        public static void ShowNotification(string title, string message, NotificationType type = NotificationType.Info)
        {
            var toastXml = ToastNotificationManager.GetTemplateContent(ToastTemplateType.ToastText02);
            
            var stringElements = toastXml.GetElementsByTagName("text");
            stringElements[0].AppendChild(toastXml.CreateTextNode(title));
            stringElements[1].AppendChild(toastXml.CreateTextNode(message));
            
            var toast = new ToastNotification(toastXml);
            ToastNotificationManager.CreateToastNotifier("Workflow Platform").Show(toast);
        }
    }

    public enum NotificationType
    {
        Info,
        Success,
        Warning,
        Error
    }
}