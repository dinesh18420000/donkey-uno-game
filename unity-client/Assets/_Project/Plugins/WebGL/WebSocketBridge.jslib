mergeInto(LibraryManager.library, {
    WebSocketConnect: function (urlPtr) {
        var url = UTF8ToString(urlPtr);
        if (window.unityWebSocket) {
            window.unityWebSocket.close();
        }
        window.unityWebSocket = new WebSocket(url);
        window.unityWebSocket.onopen = function () {
            SendMessage('SocketService', 'OnWebGLOpen');
        };
        window.unityWebSocket.onmessage = function (event) {
            SendMessage('SocketService', 'OnWebGLMessage', event.data);
        };
        window.unityWebSocket.onerror = function (event) {
            SendMessage('SocketService', 'OnWebGLError', 'WebSocket error');
        };
        window.unityWebSocket.onclose = function (event) {
            SendMessage('SocketService', 'OnWebGLClose', event.reason || 'Closed');
        };
    },

    WebSocketSend: function (msgPtr) {
        var msg = UTF8ToString(msgPtr);
        if (window.unityWebSocket && window.unityWebSocket.readyState === WebSocket.OPEN) {
            window.unityWebSocket.send(msg);
        }
    },

    WebSocketClose: function () {
        if (window.unityWebSocket) {
            window.unityWebSocket.close();
            window.unityWebSocket = null;
        }
    }
});
