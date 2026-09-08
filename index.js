// expo-router 부팅(앱 루트 등록)을 그대로 수행한 뒤, Android 위젯 헤드리스 태스크 핸들러를 등록한다.
import 'expo-router/entry';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widget/taskHandler';

registerWidgetTaskHandler(widgetTaskHandler);
