import React, { Component } from "react";
import { AlertTriangle, RefreshCw, Copy } from "lucide-react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });

    // Send to error tracking service (e.g., Sentry)
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleCopyError = () => {
    const errorMessage = `${this.state.error?.toString()}\n\nStack: ${
      this.state.errorInfo?.componentStack
    }`;
    navigator.clipboard.writeText(errorMessage);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center border border-gray-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-500 mb-6">
              We've logged this issue and are working to fix it. Please try
              reloading the application.
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mb-6 text-left overflow-auto max-h-40">
              <p className="text-xs text-gray-600 font-mono break-all mb-2">
                <span className="text-red-600 font-bold">Error:</span>{" "}
                {this.state.error?.toString()}
              </p>
              {this.state.errorInfo && (
                <p className="text-xs text-gray-600 font-mono break-all">
                  <span className="text-red-600 font-bold">Details:</span>{" "}
                  {this.state.errorInfo.componentStack}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={this.handleCopyError}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                title="Copy error details"
              >
                <Copy className="w-4 h-4" />
                <span>{this.state.copied ? "Copied!" : "Copy Error"}</span>
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all transform active:scale-95 shadow-lg shadow-indigo-200"
                title="Reload the application"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
