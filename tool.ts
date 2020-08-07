function whatsUrCapability(flag: number) {
  const capabilities: [string, number][] = [
    ["CLIENT_LONG_PASSWORD	", 0x00000001],
    ["CLIENT_FOUND_ROWS	", 0x00000002],
    ["CLIENT_LONG_FLAG	", 0x00000004],
    ["CLIENT_CONNECT_WITH_DB	", 0x00000008],
    ["CLIENT_NO_SCHEMA	", 0x00000010],
    ["CLIENT_COMPRESS	", 0x00000020],
    ["CLIENT_ODBC	", 0x00000040],
    ["CLIENT_LOCAL_FILES	", 0x00000080],
    ["CLIENT_IGNORE_SPACE	", 0x00000100],
    ["CLIENT_PROTOCOL_41	", 0x00000200],
    ["CLIENT_INTERACTIVE	", 0x00000400],
    ["CLIENT_SSL	", 0x00000800],
    ["CLIENT_IGNORE_SIGPIPE	", 0x00001000],
    ["CLIENT_TRANSACTIONS	", 0x00002000],
    ["CLIENT_RESERVED	", 0x00004000],
    ["CLIENT_SECURE_CONNECTION	", 0x00008000],
    ["CLIENT_MULTI_STATEMENTS	", 0x00010000],
    ["CLIENT_MULTI_RESULTS	", 0x00020000],
    ["CLIENT_PS_MULTI_RESULTS	", 0x00040000],
    ["CLIENT_PLUGIN_AUTH	", 0x00080000],
    ["CLIENT_CONNECT_ATTRS	", 0x00100000],
    ["CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA	", 0x00200000],
    ["CLIENT_CAN_HANDLE_EXPIRED_PASSWORDS	", 0x00400000],
    ["CLIENT_SESSION_TRACK	", 0x00800000],
    ["CLIENT_DEPECATE_EOF", 0x01000000],
  ];

  return capabilities.filter(item => item[1] & flag).map(item => [...item, item[1].toString(2)]);
}

// console.log('big endian',whatsUrCapability(0xcff3aa00))
console.log('big endian',whatsUrCapability(0x012aa20d))
// console.log('little endian',whatsUrCapability(0x00aaf3cf))