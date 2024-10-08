import ReconnectingWebSocket from 'reconnecting-websocket';
import WebSocket from 'isomorphic-ws';
import { Subject } from 'rxjs';
import { AxelarListenerEvent } from './eventTypes';
import { logger } from '../../logger';

export class AxelarListener {
  private wsMap: Map<string, ReconnectingWebSocket>;
  private wsOptions = {
    WebSocket, // custom WebSocket constructor
    maxRetries: Infinity,
  };

  private wsUrl: string;

  constructor(wsUrl: string) {
    this.wsMap = new Map();
    this.wsUrl = wsUrl;
  }

  private initWs(topicId: string) {
    const _ws = this.wsMap.get(topicId);
    if (_ws) {
      return _ws;
    }
    const ws = new ReconnectingWebSocket(this.wsUrl, [], this.wsOptions);
    this.wsMap.set(topicId, ws);

    return ws;
  }

  public listen<T>(event: AxelarListenerEvent<T>, subject: Subject<T>) {
    const ws = this.initWs(event.topicId);
    ws.addEventListener('open', () => {
      ws.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'subscribe',
          params: [event.topicId],
        })
      );
      logger.info(`[AxelarListener] Listening to "${event.type}" event`);
    });

    ws.addEventListener('close', () => {
      logger.debug(`[AxelarListener] ws connection for ${event.type} is closed. Reconnect Ws...`);
      ws.reconnect();
    });

    ws.addEventListener('message', (ev: MessageEvent<any>) => {
      // convert buffer to json
      // logger.debug(`[AxelarListener] Received message: ${ev.data.toString()}`);
      const _event = JSON.parse(ev.data.toString());
      logger.debug(`[AxelarListener] Received message of topic : ${event.topicId} with query: ${_event.result.query}`);
      // check if the event topic is matched
      if (!_event.result || _event.result.query !== event.topicId) {
        logger.debug(`[AxelarListener] Unmatched message: ${ev.data.toString()}`);
        return;
      }
      logger.debug(`[AxelarListener] Received Event: ${JSON.stringify(ev)}`);

      // parse the event data
      event
        .parseEvent(_event.result.events)
        .then((ev) => {
          subject.next(ev);
        })
        .catch((e) => {
          logger.debug(`[AxelarListener] Failed to parse topic ${event.topicId} GMP event: ${e}`);

        });
    });
  }
}
