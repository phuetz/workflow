import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle } from 'lucide-react';

interface VoiceCommand {
  command: string;
  action: () => void;
  description: string;
}

export default function VoiceAssistant() {
  const { 
    darkMode, 
    nodes, 
    edges, 
    executionHistory, 
    isExecuting,
    addLog 
  } = useWorkflowStore();
  
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'fr-FR';

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTranscript(transcript);
        
        if (event.results[0].isFinal) {
          processVoiceCommand(transcript);
        }
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        speak('Désolé, je n\'ai pas compris votre commande');
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const voiceCommands: VoiceCommand[] = [
    {
      command: "état du workflow",
      action: () => {
        const status = isExecuting ? 'en cours d\'exécution' : 'arrêté';
        speak(`Le workflow est actuellement ${status}. Il contient ${nodes.length} nœuds et ${edges.length} connexions.`);
      },
      description: "Obtenir l'état actuel du workflow"
    },
    {
      command: "dernière exécution",
      action: () => {
        const lastExecution = executionHistory[0];
        if (lastExecution) {
          const status = lastExecution.status === 'success' ? 'réussie' : 'échouée';
          speak(`La dernière exécution a ${status} et a duré ${lastExecution.duration} millisecondes.`);
        } else {
          speak('Aucune exécution précédente trouvée.');
        }
      },
      description: "Informations sur la dernière exécution"
    },
    {
      command: "créer workflow",
      action: () => {
        speak('Je vais vous guider pour créer un nouveau workflow. Dites-moi quel type de déclencheur vous souhaitez utiliser.');
      },
      description: "Aide à la création d'un workflow"
    },
    {
      command: "sauvegarder",
      action: () => {
        useWorkflowStore.getState().saveWorkflow();
        speak('Workflow sauvegardé avec succès.');
      },
      description: "Sauvegarder le workflow actuel"
    },
    {
      command: "mode sombre",
      action: () => {
        useWorkflowStore.getState().toggleDarkMode();
        const newMode = useWorkflowStore.getState().darkMode ? 'sombre' : 'clair';
        speak(`Mode ${newMode} activé.`);
      },
      description: "Changer le thème"
    },
    {
      command: "aide",
      action: () => {
        speak('Je peux vous aider avec les commandes suivantes : état du workflow, dernière exécution, créer workflow, sauvegarder, ou mode sombre. Que puis-je faire pour vous ?');
      },
      description: "Liste des commandes disponibles"
    }
  ];

  const startListening = () => {
    if (recognition) {
      setIsListening(true);
      setTranscript('');
      recognition.start();
      
      addLog({
        level: 'info',
        message: 'Assistant vocal activé',
        data: { action: 'start_listening' }
      });
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      speechSynthesis.speak(utterance);
      
      addLog({
        level: 'info',
        message: 'Assistant vocal répond',
        data: { response: text.substring(0, 50) + '...' }
      });
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const processVoiceCommand = (transcript: string) => {
    const command = transcript.toLowerCase().trim();
    
    // Find matching command
    const matchedCommand = voiceCommands.find(cmd => 
      command.includes(cmd.command) || 
      cmd.command.includes(command)
    );
    
    if (matchedCommand) {
      matchedCommand.action();
      addLog({
        level: 'info',
        message: 'Commande vocale exécutée',
        data: { command: matchedCommand.command, transcript }
      });
    } else {
      // Try to handle natural language
      if (command.includes('combien') && command.includes('nœud')) {
        speak(`Il y a actuellement ${nodes.length} nœuds dans votre workflow.`);
      } else if (command.includes('exécuter') || command.includes('lancer')) {
        if (nodes.length > 0) {
          speak('Exécution du workflow en cours...');
          // Could trigger workflow execution here
        } else {
          speak('Impossible d\'exécuter : aucun nœud dans le workflow.');
        }
      } else {
        speak('Désolé, je n\'ai pas compris cette commande. Dites "aide" pour voir les commandes disponibles.');
      }
    }
    
    setTranscript('');
  };

  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  if (!isSupported) {
    return null;
  }

  return (
    <>
      {/* Voice Assistant Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed top-56 left-4 z-40 p-3 rounded-full ${
          darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
        } text-white shadow-lg transition-all hover:scale-105`}
        title="Assistant vocal"
      >
        <MessageCircle size={20} />
        {(isListening || isSpeaking) && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        )}
      </button>

      {/* Voice Assistant Panel */}
      {isOpen && (
        <div className={`fixed top-20 left-4 z-30 w-80 ${
          darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        } border rounded-lg overflow-hidden flex flex-col z-10`}>
          {/* Header */}
          <div className={`p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-b flex-shrink-0`}>
            <h2 className="text-lg font-semibold mb-4 truncate">Assistant Vocal</h2>
          </div>
          
          {/* Status */}
          <div className="p-4">
            <div className="text-center mb-4">
              {isListening && (
                <div className="flex items-center justify-center space-x-2 text-blue-500">
                  <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Écoute en cours...</span>
                </div>
              )}
              {isSpeaking && (
                <div className="flex items-center justify-center space-x-2 text-green-500">
                  <div className="animate-bounce w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Réponse...</span>
                </div>
              )}
              {!isListening && !isSpeaking && (
                <span className="text-sm text-gray-500">En attente</span>
              )}
            </div>

            {/* Transcript */}
            {transcript && (
              <div className={`p-3 rounded-lg mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="text-sm font-medium mb-1">Vous avez dit :</div>
                <div className="text-sm italic">"{transcript}"</div>
              </div>
            )}

            {/* Controls */}
            <div className="flex space-x-2 mb-4">
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isSpeaking}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg transition-colors ${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50'
                }`}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                <span>{isListening ? 'Arrêter' : 'Parler'}</span>
              </button>
              
              <button
                onClick={isSpeaking ? stopSpeaking : () => speak('Assistant vocal prêt à vous aider')}
                className={`p-3 rounded-lg transition-colors ${
                  isSpeaking 
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                    : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>

            {/* Commands Help */}
            <div>
              <h4 className="font-medium text-sm mb-2">Commandes disponibles :</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {voiceCommands.map((cmd, index) => (
                  <div key={index} className={`p-2 rounded text-xs ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="font-medium">"{cmd.command}"</div>
                    <div className="text-gray-500">{cmd.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-4 space-y-2">
              <button
                onClick={() => speak(`Workflow actuel : ${nodes.length} nœuds, ${edges.length} connexions`)}
                className="w-full text-left p-2 rounded bg-blue-100 text-blue-800 text-sm hover:bg-blue-200"
              >
                🔊 État du workflow
              </button>
              <button
                onClick={() => speak('Comment puis-je vous aider avec votre workflow ?')}
                className="w-full text-left p-2 rounded bg-green-100 text-green-800 text-sm hover:bg-green-200"
              >
                🤖 Test assistant
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className={`p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} border-t flex-shrink-0`}>
            <button
              onClick={() => setIsOpen(false)}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 text-sm flex items-center justify-center"
            >
              Fermer l'assistant vocal
            </button>
          </div>
        </div>
      )}
    </>
  );
}