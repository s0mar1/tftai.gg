import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class TFTDataErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TFTDataErrorBoundary: 에러 캐치됨', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                데이터 로딩 오류
              </h2>
              <p className="text-gray-600 mb-6">
                TFT 데이터를 불러오는 중 문제가 발생했습니다.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    this.setState({ hasError: false, error: null, errorInfo: null });
                    window.location.reload();
                  }}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  페이지 새로고침
                </button>
                <button
                  onClick={() => {
                    // 로컬 스토리지 캐시 클리어
                    const keys = Object.keys(localStorage);
                    keys.forEach(key => {
                      if (key.startsWith('tft-data-') || key.startsWith('items-data-')) {
                        localStorage.removeItem(key);
                      }
                    });
                    this.setState({ hasError: false, error: null, errorInfo: null });
                    window.location.reload();
                  }}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  캐시 초기화 후 새로고침
                </button>
              </div>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-gray-700 font-medium">
                    개발자 정보 (클릭하여 펼치기)
                  </summary>
                  <div className="mt-2 p-4 bg-gray-100 rounded text-sm text-gray-800">
                    <p className="font-semibold">Error:</p>
                    <p className="font-mono text-xs mb-2">{this.state.error.message}</p>
                    <p className="font-semibold">Stack:</p>
                    <pre className="font-mono text-xs whitespace-pre-wrap overflow-auto max-h-32">
                      {this.state.error.stack}
                    </pre>
                    {this.state.errorInfo && (
                      <>
                        <p className="font-semibold mt-2">Component Stack:</p>
                        <pre className="font-mono text-xs whitespace-pre-wrap overflow-auto max-h-32">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default TFTDataErrorBoundary;