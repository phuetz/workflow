/**
 * Workflow Android App - Main Activity
 * Native Android application using Jetpack Compose
 */

package com.workflow.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.rememberNavController
import com.workflow.app.ui.navigation.WorkflowNavHost
import com.workflow.app.ui.theme.WorkflowTheme
import com.workflow.app.viewmodels.AuthViewModel
import com.workflow.app.viewmodels.WorkflowViewModel
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    
    private val authViewModel: AuthViewModel by viewModels()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Setup biometric authentication
        setupBiometricAuth()
        
        setContent {
            WorkflowTheme {
                WorkflowApp(authViewModel)
            }
        }
    }
    
    private fun setupBiometricAuth() {
        val executor = ContextCompat.getMainExecutor(this)
        val biometricPrompt = BiometricPrompt(this, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    authViewModel.onBiometricAuthSuccess()
                }
                
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    authViewModel.onBiometricAuthError(errString.toString())
                }
                
                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                    authViewModel.onBiometricAuthFailed()
                }
            })
        
        authViewModel.setBiometricPrompt(biometricPrompt)
    }
}

@Composable
fun WorkflowApp(authViewModel: AuthViewModel) {
    val navController = rememberNavController()
    val isAuthenticated by authViewModel.isAuthenticated.collectAsState()
    
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        if (isAuthenticated) {
            WorkflowNavHost(
                navController = navController,
                authViewModel = authViewModel
            )
        } else {
            LoginScreen(authViewModel = authViewModel)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(authViewModel: AuthViewModel) {
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    
    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Workflow Platform") }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.Center
        ) {
            // Logo
            WorkflowLogo(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .padding(bottom = 32.dp)
            )
            
            // Email Field
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                enabled = !isLoading
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Password Field
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                enabled = !isLoading
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Login Button
            Button(
                onClick = {
                    scope.launch {
                        isLoading = true
                        authViewModel.login(email, password)
                        isLoading = false
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isLoading && email.isNotEmpty() && password.isNotEmpty()
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("Login")
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Biometric Login
            OutlinedButton(
                onClick = { authViewModel.authenticateWithBiometric() },
                modifier = Modifier.fillMaxWidth(),
                enabled = !isLoading && authViewModel.isBiometricAvailable()
            ) {
                Icon(
                    imageVector = Icons.Default.Fingerprint,
                    contentDescription = "Biometric Login"
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Login with Biometrics")
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // SSO Options
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                SSOButton(
                    provider = "Google",
                    icon = R.drawable.ic_google,
                    onClick = { authViewModel.loginWithGoogle() }
                )
                
                SSOButton(
                    provider = "GitHub",
                    icon = R.drawable.ic_github,
                    onClick = { authViewModel.loginWithGitHub() }
                )
                
                SSOButton(
                    provider = "Microsoft",
                    icon = R.drawable.ic_microsoft,
                    onClick = { authViewModel.loginWithMicrosoft() }
                )
            }
        }
    }
}

@Composable
fun SSOButton(
    provider: String,
    icon: Int,
    onClick: () -> Unit
) {
    OutlinedButton(
        onClick = onClick,
        modifier = Modifier.size(56.dp),
        contentPadding = PaddingValues(0.dp)
    ) {
        Icon(
            painter = painterResource(id = icon),
            contentDescription = "Login with $provider",
            modifier = Modifier.size(24.dp)
        )
    }
}

@Composable
fun WorkflowLogo(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier,
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = Icons.Default.AccountTree,
            contentDescription = "Workflow Logo",
            modifier = Modifier.size(80.dp),
            tint = MaterialTheme.colorScheme.primary
        )
    }
}