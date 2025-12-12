import { Provider } from '../types';
/** @internal */
export declare function hasProperty<T>(object: any, property: string): object is T;
/** @internal */
export declare function stopProvider(defaultProvider: Provider): void;
