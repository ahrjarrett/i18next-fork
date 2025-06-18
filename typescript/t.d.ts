import type { $PreservedValue, $Dictionary, $StringKeyPathToRecord, $Prune } from './helpers.js';
import type { TypeOptions, Namespace, TOptions, TOptionsBase } from './options.js';

/** @todo consider to replace {} with Record<string, never> */
/* eslint @typescript-eslint/ban-types: ['error', { types: { "{}": false } }] */

// Type Options
type _ReturnObjects = TypeOptions['returnObjects'];
type _PluralSeparator = TypeOptions['pluralSeparator'];
type _ContextSeparator = TypeOptions['contextSeparator'];
type _Resources = TypeOptions['resources'];
type _InterpolationPrefix = TypeOptions['interpolationPrefix'];
type _InterpolationSuffix = TypeOptions['interpolationSuffix'];
type _UnescapePrefix = TypeOptions['unescapePrefix'];
type _UnescapeSuffix = TypeOptions['unescapeSuffix'];

type $IsResourcesDefined = [keyof _Resources] extends [never] ? false : true;
type WithFallback<T, Fallback> = $IsResourcesDefined extends true ? T : Fallback;
type $FirstNamespace<Ns extends Namespace> = Ns extends readonly any[] ? Ns[0] : Ns;
type Resources = WithFallback<_Resources, $Dictionary<string>>;
type PluralSuffix = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
type Options = Omit<TOptionsBase, 'ns'> & $Dictionary;

type TrimSpaces<T extends string, Acc extends string = ''> = T extends `${infer Char}${infer Rest}`
  ? Char extends ' '
    ? TrimSpaces<Rest, Acc>
    : TrimSpaces<Rest, `${Acc}${Char}`>
  : T extends ''
    ? Acc
    : never;

interface Branded<Ns extends Namespace> {
  $TFunctionBrand: $IsResourcesDefined extends true
    ? `${Ns extends readonly any[] ? Ns[0] : Ns}`
    : never;
}

type ParseActualValue<Ret> = Ret extends `${_UnescapePrefix}${infer ActualValue}${_UnescapeSuffix}`
  ? TrimSpaces<ActualValue>
  : Ret;

type ParseInterpolationValues<Ret> =
  Ret extends `${string}${_InterpolationPrefix}${infer Value}${_InterpolationSuffix}${infer Rest}`
    ?
        | (Value extends `${infer ActualValue},${string}`
            ? ParseActualValue<ActualValue>
            : ParseActualValue<Value>)
        | ParseInterpolationValues<Rest>
    : never;

type InterpolationMap<Ret> = $PreservedValue<
  $StringKeyPathToRecord<ParseInterpolationValues<Ret>, unknown>,
  Record<string, unknown>
>;

type TFunctionDetailedResult<T = string, TOpt extends TOptions = {}> = {
  /**
   * The plain used key
   */
  usedKey: string;
  /**
   * The translation result.
   */
  res: T;
  /**
   * The key with context / plural
   */
  exactUsedKey: string;
  /**
   * The used language for this translation.
   */
  usedLng: string;
  /**
   * The used namespace for this translation.
   */
  usedNS: string;
  /**
   * The parameters used for interpolation.
   */
  usedParams: InterpolationMap<T> & { count?: TOpt['count'] };
};

type ReturnOptionalDetails<Ret, TOpt extends TOptions> = TOpt['returnDetails'] extends true
  ? TFunctionDetailedResult<Ret, TOpt>
  : Ret;

type KeyPrefix<T extends [any], K> = K extends `${infer Head}.${infer Tail}`
  ? KeyPrefix<[T[0][Head]], Tail>
  : T[0][K & string];

type GetSource<Ns extends Namespace, KPrefix> = KPrefix extends keyof Resources[$FirstNamespace<Ns>]
  ? Resources[$FirstNamespace<Ns>][KPrefix]
  : undefined extends KPrefix
    ? Resources[$FirstNamespace<Ns>]
    : KeyPrefix<[Resources[$FirstNamespace<Ns>]], KPrefix>;

type ConstrainTarget<Opts extends Options> = _ReturnObjects extends true
  ? {}
  : Opts['returnObjects'] extends true
    ? {}
    : string;

type ApplyTarget<T, Opts extends Options> = Opts['returnObjects'] extends true ? {} : T;

type ProcessReturnValue<Target, DefaultValue> = [DefaultValue] extends [never]
  ? Target
  : unknown extends DefaultValue
    ? Target
    : Target | DefaultValue;

type FilterKeys<T, Context> = never | T extends readonly any[]
  ? { [I in keyof T]: FilterKeys<T[I], Context> }
  : $Prune<
      {
        [K in keyof T as T[K] extends object
          ? K
          : Context extends string
            ? never
            : K extends `${string}${_PluralSeparator}${PluralSuffix}`
              ? never
              : K]: T[K] extends object ? FilterKeys<T[K], Context> : T[K];
      } & {
        [K in keyof T as T[K] extends object
          ? never
          : Context extends string
            ? never
            : K extends
                  | `${infer Prefix}${_PluralSeparator}${PluralSuffix}`
                  | `${infer Prefix}${_PluralSeparator}ordinal${_PluralSeparator}${PluralSuffix}`
              ? Prefix
              : never]: T[K] extends object ? FilterKeys<T[K], Context> : T[K];
      } & {
        [K in keyof T as T[K] extends object
          ? never
          : Context extends string
            ? K extends
                | `${infer Prefix}${_ContextSeparator}${Context}`
                | `${infer Prefix}${_ContextSeparator}${Context}${_PluralSeparator}${PluralSuffix}`
              ? Prefix
              : never
            : never]: T[K] extends object ? FilterKeys<T[K], Context> : T[K];
      }
    >;

interface TFunction<Ns extends Namespace, KPrefix, Source> extends Branded<Ns> {
  <
    Target extends ConstrainTarget<Opts>,
    const Opts extends Options,
    NsOverride extends Namespace,
    SourceOverride extends GetSource<NsOverride, KPrefix>,
  >(
    selector: ($: FilterKeys<SourceOverride, Opts['context']>) => ApplyTarget<Target, Opts>,
    options: Opts & InterpolationMap<Target> & { ns: NsOverride },
  ): ReturnOptionalDetails<ProcessReturnValue<Target, Opts['defaultValue']>, Opts>;
  <Target extends ConstrainTarget<Opts>, const Opts extends Options>(
    selector: ($: FilterKeys<Source, Opts['context']>) => ApplyTarget<Target, Opts>,
    options?: Opts & InterpolationMap<Target>,
  ): ReturnOptionalDetails<ProcessReturnValue<Target, Opts['defaultValue']>, Opts>;
}
