import * as Blockly from 'blockly/core';

const CPP_RESERVED_WORDS = [
  // C++ keywords
  'alignas,alignof,and,and_eq,asm,auto,bitand,bitor,bool,break,case,catch,char,char16_t',
  'char32_t,class,compl,const,constexpr,const_cast,continue,decltype,default,delete,do',
  'double,dynamic_cast,else,enum,explicit,export,extern,false,float,for,friend,goto,if',
  'inline,int,long,mutable,namespace,new,noexcept,not,not_eq,nullptr,operator,or,or_eq',
  'private,protected,public,register,reinterpret_cast,return,short,signed,sizeof,static',
  'static_assert,static_cast,struct,switch,template,this,thread_local,throw,true,try',
  'typedef,typeid,typename,union,unsigned,using,virtual,void,volatile,wchar_t,while,xor',
  'xor_eq',
  // Core API names that user variables must not shadow
  'setup,loop,main,HIGH,LOW,INPUT,OUTPUT,INPUT_PULLUP,LED_BUILTIN,Serial,String,byte,word',
  'boolean,pinMode,digitalWrite,digitalRead,analogRead,analogWrite,delay,millis,micros',
  'tone,noTone,map,constrain,random,randomSeed,abs,min,max,pow,sqrt,sin,cos,tan,round',
  'floor,ceil,PI,Servo,A0,A1,A2,A3,A4,A5,A6,A7',
].join(',');

/** Removes accents so "número" becomes "numero" instead of an escaped sequence. */
export function toAsciiIdentifier(name: string): string {
  const ascii = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_]/g, '_');
  if (ascii === '') return 'unnamed';
  return /^[0-9]/.test(ascii) ? `_${ascii}` : ascii;
}

export function createNameDatabase(): Blockly.Names {
  const names = new Blockly.Names(CPP_RESERVED_WORDS);
  // safeName is private in the type definitions but is the only hook that
  // controls how display names become identifiers.
  (names as unknown as { safeName: (name: string) => string }).safeName = toAsciiIdentifier;
  return names;
}
