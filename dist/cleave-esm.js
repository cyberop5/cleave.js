var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

var NumeralFormatter = function (numeralDecimalMark,
                                 numeralIntegerScale,
                                 numeralDecimalScale,
                                 numeralThousandsGroupStyle,
                                 numeralPositiveOnly,
                                 stripLeadingZeroes,
                                 prefix,
                                 signBeforePrefix,
                                 delimiter) {
    var owner = this;

    owner.numeralDecimalMark = numeralDecimalMark || '.';
    owner.numeralIntegerScale = numeralIntegerScale > 0 ? numeralIntegerScale : 0;
    owner.numeralDecimalScale = numeralDecimalScale >= 0 ? numeralDecimalScale : 2;
    owner.numeralThousandsGroupStyle = numeralThousandsGroupStyle || NumeralFormatter.groupStyle.thousand;
    owner.numeralPositiveOnly = !!numeralPositiveOnly;
    owner.stripLeadingZeroes = stripLeadingZeroes !== false;
    owner.prefix = (prefix || prefix === '') ? prefix : '';
    owner.signBeforePrefix = !!signBeforePrefix;
    owner.delimiter = (delimiter || delimiter === '') ? delimiter : ',';
    owner.delimiterRE = delimiter ? new RegExp('\\' + delimiter, 'g') : '';
};

NumeralFormatter.groupStyle = {
    thousand: 'thousand',
    lakh:     'lakh',
    wan:      'wan',
    none:     'none'    
};

NumeralFormatter.prototype = {
    getRawValue: function (value) {
        return value.replace(this.delimiterRE, '').replace(this.numeralDecimalMark, '.');
    },

    format: function (value) {
        var owner = this, parts, partSign, partSignAndPrefix, partInteger, partDecimal = '';

        // strip alphabet letters
        value = value.replace(/[A-Za-z]/g, '')
            // replace the first decimal mark with reserved placeholder
            .replace(owner.numeralDecimalMark, 'M')

            // strip non numeric letters except minus and "M"
            // this is to ensure prefix has been stripped
            .replace(/[^\dM-]/g, '')

            // replace the leading minus with reserved placeholder
            .replace(/^\-/, 'N')

            // strip the other minus sign (if present)
            .replace(/\-/g, '')

            // replace the minus sign (if present)
            .replace('N', owner.numeralPositiveOnly ? '' : '-')

            // replace decimal mark
            .replace('M', owner.numeralDecimalMark);

        // strip any leading zeros
        if (owner.stripLeadingZeroes) {
            value = value.replace(/^(-)?0+(?=\d)/, '$1');
        }

        partSign = value.slice(0, 1) === '-' ? '-' : '';
        if (typeof owner.prefix != 'undefined') {
            if (owner.signBeforePrefix) {
                partSignAndPrefix = partSign + owner.prefix;
            } else {
                partSignAndPrefix = owner.prefix + partSign;
            }
        } else {
            partSignAndPrefix = partSign;
        }
        
        partInteger = value;

        if (value.indexOf(owner.numeralDecimalMark) >= 0) {
            parts = value.split(owner.numeralDecimalMark);
            partInteger = parts[0];
            partDecimal = owner.numeralDecimalMark + parts[1].slice(0, owner.numeralDecimalScale);
        }

        if(partSign === '-') {
            partInteger = partInteger.slice(1);
        }

        if (owner.numeralIntegerScale > 0) {
          partInteger = partInteger.slice(0, owner.numeralIntegerScale);
        }

        switch (owner.numeralThousandsGroupStyle) {
        case NumeralFormatter.groupStyle.lakh:
            partInteger = partInteger.replace(/(\d)(?=(\d\d)+\d$)/g, '$1' + owner.delimiter);

            break;

        case NumeralFormatter.groupStyle.wan:
            partInteger = partInteger.replace(/(\d)(?=(\d{4})+$)/g, '$1' + owner.delimiter);

            break;

        case NumeralFormatter.groupStyle.thousand:
            partInteger = partInteger.replace(/(\d)(?=(\d{3})+$)/g, '$1' + owner.delimiter);

            break;
        }

        return partSignAndPrefix + partInteger.toString() + (owner.numeralDecimalScale > 0 ? partDecimal.toString() : '');
    }
};

var NumeralFormatter_1 = NumeralFormatter;

var DateFormatter = function(datePattern, dateMin, dateMax) {
  var owner = this;

  owner.date = [];
  owner.blocks = [];
  owner.datePattern = datePattern;
  owner.dateMin = dateMin
    .split("-")
    .reverse()
    .map(function(x) {
      return parseInt(x, 10);
    });
  if (owner.dateMin.length === 2) owner.dateMin.unshift(0);

  owner.dateMax = dateMax
    .split("-")
    .reverse()
    .map(function(x) {
      return parseInt(x, 10);
    });
  if (owner.dateMax.length === 2) owner.dateMax.unshift(0);

  owner.initBlocks();
};

DateFormatter.prototype = {
  initBlocks: function() {
    var owner = this;
    owner.datePattern.forEach(function(value) {
      if (value === "Y") {
        owner.blocks.push(4);
      } else {
        owner.blocks.push(2);
      }
    });
  },

  getISOFormatDate: function() {
    var owner = this,
      date = owner.date;

    return date[2]
      ? date[2] +
          "-" +
          owner.addLeadingZero(date[1]) +
          "-" +
          owner.addLeadingZero(date[0])
      : "";
  },

  getBlocks: function() {
    return this.blocks;
  },

  getValidatedDate: function(value) {
    var owner = this,
      result = "";

    value = value.replace(/[^\d]/g, "");

    owner.blocks.forEach(function(length, index) {
      if (value.length > 0) {
        var sub = value.slice(0, length),
          sub0 = sub.slice(0, 1),
          rest = value.slice(length);

        switch (owner.datePattern[index]) {
          case "d":
            if (sub === "00") {
              sub = "01";
            } else if (parseInt(sub0, 10) > 3) {
              sub = "0" + sub0;
            } else if (parseInt(sub, 10) > 31) {
              sub = "31";
            }

            break;

          case "m":
            if (sub === "00") {
              sub = "01";
            } else if (parseInt(sub0, 10) > 1) {
              sub = "0" + sub0;
            } else if (parseInt(sub, 10) > 12) {
              sub = "12";
            }

            break;
        }

        result += sub;

        // update remaining string
        value = rest;
      }
    });

    return this.getFixedDateString(result);
  },

  getFixedDateString: function(value) {
    var owner = this,
      datePattern = owner.datePattern,
      date = [],
      dayIndex = 0,
      monthIndex = 0,
      yearIndex = 0,
      dayStartIndex = 0,
      monthStartIndex = 0,
      yearStartIndex = 0,
      day,
      month,
      year,
      fullYearDone = false;

    // mm-dd || dd-mm
    if (
      value.length === 4 &&
      datePattern[0].toLowerCase() !== "y" &&
      datePattern[1].toLowerCase() !== "y"
    ) {
      dayStartIndex = datePattern[0] === "d" ? 0 : 2;
      monthStartIndex = 2 - dayStartIndex;
      day = parseInt(value.slice(dayStartIndex, dayStartIndex + 2), 10);
      month = parseInt(value.slice(monthStartIndex, monthStartIndex + 2), 10);

      date = this.getFixedDate(day, month, 0);
    }

    // yyyy-mm-dd || yyyy-dd-mm || mm-dd-yyyy || dd-mm-yyyy || dd-yyyy-mm || mm-yyyy-dd
    if (value.length === 8) {
      datePattern.forEach(function(type, index) {
        switch (type) {
          case "d":
            dayIndex = index;
            break;
          case "m":
            monthIndex = index;
            break;
          default:
            yearIndex = index;
            break;
        }
      });

      yearStartIndex = yearIndex * 2;
      dayStartIndex = dayIndex <= yearIndex ? dayIndex * 2 : dayIndex * 2 + 2;
      monthStartIndex =
        monthIndex <= yearIndex ? monthIndex * 2 : monthIndex * 2 + 2;

      day = parseInt(value.slice(dayStartIndex, dayStartIndex + 2), 10);
      month = parseInt(value.slice(monthStartIndex, monthStartIndex + 2), 10);
      year = parseInt(value.slice(yearStartIndex, yearStartIndex + 4), 10);

      fullYearDone =
        value.slice(yearStartIndex, yearStartIndex + 4).length === 4;

      date = this.getFixedDate(day, month, year);
    }

    // mm-yy || yy-mm
    if (
      value.length === 4 &&
      (datePattern[0] === "y" || datePattern[1] === "y")
    ) {
      monthStartIndex = datePattern[0] === "m" ? 0 : 2;
      yearStartIndex = 2 - monthStartIndex;
      month = parseInt(value.slice(monthStartIndex, monthStartIndex + 2), 10);
      year = parseInt(value.slice(yearStartIndex, yearStartIndex + 2), 10);

      fullYearDone =
        value.slice(yearStartIndex, yearStartIndex + 2).length === 2;

      date = [0, month, year];
    }

    // mm-yyyy || yyyy-mm
    if (
      value.length === 6 &&
      (datePattern[0] === "Y" || datePattern[1] === "Y")
    ) {
      monthStartIndex = datePattern[0] === "m" ? 0 : 4;
      yearStartIndex = 2 - 0.5 * monthStartIndex;
      month = parseInt(value.slice(monthStartIndex, monthStartIndex + 2), 10);
      year = parseInt(value.slice(yearStartIndex, yearStartIndex + 4), 10);

      fullYearDone =
        value.slice(yearStartIndex, yearStartIndex + 4).length === 4;

      date = [0, month, year];
    }

    date = owner.getRangeFixedDate(date);
    owner.date = date;

    var result =
      date.length === 0
        ? value
        : datePattern.reduce(function(previous, current) {
            switch (current) {
              case "d":
                return (
                  previous +
                  (date[0] === 0 ? "" : owner.addLeadingZero(date[0]))
                );
              case "m":
                return (
                  previous +
                  (date[1] === 0 ? "" : owner.addLeadingZero(date[1]))
                );
              case "y":
                return (
                  previous +
                  (fullYearDone
                    ? owner.addLeadingZeroForYear(date[2], false)
                    : "")
                );
              case "Y":
                return (
                  previous +
                  (fullYearDone
                    ? owner.addLeadingZeroForYear(date[2], true)
                    : "")
                );
            }
          }, "");

    return result;
  },

  getRangeFixedDate: function(date) {
    var owner = this,
      datePattern = owner.datePattern,
      dateMin = owner.dateMin || [],
      dateMax = owner.dateMax || [];

    if (!date.length || (dateMin.length < 3 && dateMax.length < 3)) return date;

    if (
      datePattern.find(function(x) {
        return x.toLowerCase() === "y";
      }) &&
      date[2] === 0
    )
      return date;

    if (
      dateMax.length &&
      (dateMax[2] < date[2] ||
        (dateMax[2] === date[2] &&
          (dateMax[1] < date[1] ||
            (dateMax[1] === date[1] && dateMax[0] < date[0]))))
    )
      return dateMax;

    if (
      dateMin.length &&
      (dateMin[2] > date[2] ||
        (dateMin[2] === date[2] &&
          (dateMin[1] > date[1] ||
            (dateMin[1] === date[1] && dateMin[0] > date[0]))))
    )
      return dateMin;

    return date;
  },

  getFixedDate: function(day, month, year) {
    day = Math.min(day, 31);
    month = Math.min(month, 12);
    year = parseInt(year || 0, 10);

    if ((month < 7 && month % 2 === 0) || (month > 8 && month % 2 === 1)) {
      day = Math.min(day, month === 2 ? (this.isLeapYear(year) ? 29 : 28) : 30);
    }

    return [day, month, year];
  },

  isLeapYear: function(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  },

  addLeadingZero: function(number) {
    return (number < 10 ? "0" : "") + number;
  },

  addLeadingZeroForYear: function(number, fullYearMode) {
    if (fullYearMode) {
      return (
        (number < 10 ? "000" : number < 100 ? "00" : number < 1000 ? "0" : "") +
        number
      );
    }

    return (number < 10 ? "0" : "") + number;
  }
};

var DateFormatter_1 = DateFormatter;

var DateTimeFormatter = function(
  dateTimePattern,
  dateMin,
  dateMax,
  timeFormat
) {
  var owner = this;
  var expectedMinMaxPartsLength = 3;
  owner.date = {
    year: null,
    month: null,
    day: null,
    hour: null,
    minute: null,
    second: null
  };
  owner.blocks = [];
  owner.dateTimePattern = dateTimePattern;
  owner.timeFormat = timeFormat; // '12' or '24'
  owner.dateMin = dateMin

    .split(/[\-\:\sT]/) // split on dash, colon, and space
    .reverse()
    .map(function(x) {
      return parseInt(x, 10);
    });
  while (owner.dateMin.length < expectedMinMaxPartsLength)
    owner.dateMin.unshift(0);

  owner.dateMax = dateMax
    .split(/[\-\:\sT]/) // split on dash, colon, space, and the letter T
    .reverse()
    .map(function(x) {
      return parseInt(x, 10);
    });
  while (owner.dateMax.length < expectedMinMaxPartsLength)
    owner.dateMax.unshift(0);

  owner.initBlocks();
};

DateTimeFormatter.prototype = {
  initBlocks: function() {
    var owner = this;
    owner.dateTimePattern.forEach(function(value) {
      if (value === "Y") {
        owner.blocks.push(4);
      } else {
        owner.blocks.push(2);
      }
    });
  },

  getTimeFormatOptions: function() {
    var owner = this;
    if (String(owner.timeFormat) === "12") {
      return {
        maxHourFirstDigit: 1,
        maxHours: 12,
        maxMinutesFirstDigit: 5,
        maxMinutes: 60
      };
    }

    return {
      maxHourFirstDigit: 2,
      maxHours: 23,
      maxMinutesFirstDigit: 5,
      maxMinutes: 60
    };
  },

  getISOFormatDate: function() {
    var owner = this,
      datetime = owner.datetime;

    return datetime.year
      ? datetime.year +
          "-" +
          owner.addLeadingZero(datetime.month) +
          "-" +
          owner.addLeadingZero(datetime.day)
      : "";
  },

  getISOFormatTime: function() {
    var owner = this,
      datetime = owner.datetime;

    return datetime.hour
      ? owner.addLeadingZero(datetime.hour) +
          ":" +
          owner.addLeadingZero(datetime.minute) +
          ":" +
          owner.addLeadingZero(datetime.second)
      : "";
  },

  getISOFormatDateTime: function() {
    var owner = this,
      datetime = owner.datetime;
    var dateStr = this.getISOFormatDate();
    var timeStr = this.getISOFormatTime();
    return datetime.year && dateStr
      ? dateStr + (timeStr ? " " + timeStr : "")
      : "";
  },

  getBlocks: function() {
    return this.blocks;
  },

  getValidatedDateTime: function(value) {
    var owner = this,
      result = "";
    var timeFormatOptions = owner.getTimeFormatOptions();
    value = value.replace(/[^\d]/g, "");

    owner.blocks.forEach(function(blockLength, index) {
      if (value.length > 0) {
        var sub = value.slice(0, blockLength),
          sub0 = sub.slice(0, 1),
          rest = value.slice(blockLength); // contents of value after our block

        switch (owner.dateTimePattern[index]) {
          case "d": //day of month
            if (sub === "00") {
              sub = "01";
            } else if (parseInt(sub0, 10) > 3) {
              //rest = sub.length > 1 ? sub.slice(1) + rest : rest; // move next digit to rest, and zpad this out-of-bounds number
              sub = "0" + sub0;
            } else if (parseInt(sub, 10) > 31) {
              sub = "31";
            }

            break;

          case "M": // month
            if (sub === "00") {
              sub = "01";
            } else if (parseInt(sub0, 10) > 1) {
              //rest = sub.length > 1 ? sub.slice(1) + rest : rest; // move next digit to rest, and zpad this out-of-bounds number
              sub = "0" + sub0;
            } else if (parseInt(sub, 10) > 12) {
              sub = "12";
            }

            break;

          case "h": // hour
            if (parseInt(sub0, 10) > timeFormatOptions.maxHourFirstDigit) {
              rest = sub.length > 1 ? sub.slice(1) + rest : rest;
              sub = "0" + sub0;
            } else if (parseInt(sub, 10) > timeFormatOptions.maxHours) {
              sub = timeFormatOptions.maxHours + "";
            }

            break;

          case "m": // minute
          case "s": // second
            if (parseInt(sub0, 10) > timeFormatOptions.maxMinutesFirstDigit) {
              rest = sub.length > 1 ? sub.slice(1) + rest : rest; // move next digit to rest, and zpad this out-of-bounds number
              sub = "0" + sub0;
            } else if (parseInt(sub, 10) > timeFormatOptions.maxMinutes) {
              sub = timeFormatOptions.maxMinutes + "";
            }
            break;
        }

        result += sub;

        // update remaining string
        value = rest;
      }
    });

    return this.getFixedDateTimeString(result);
  },

  getFixedDateTimeString: function(value) {
    var owner = this,
      dateTimePattern = owner.dateTimePattern,
      date = {},
      fixedDate = null,
      blocks = [],
      fullYearDone = false;

    dateTimePattern.forEach(function(type, index) {
      switch (type) {
        case "d":
        case "M":
        case "h":
        case "m":
        case "s":
          blocks.push({
            part: type,
            blockIndex: index,
            targetInputLength: 2,
            intValue: null,
            strValue: null
          });
          break;
        case "Y": // 4 digit year
        case "y": // 2 digit year
          blocks.push({
            part: type,
            blockIndex: index,
            targetInputLength: type === "Y" ? 4 : 2,
            intValue: null,
            strValue: null
          });
          break;
      }
    });

    blocks.forEach(function(block) {
      if (value.length === 0) return block;
      var str = value.slice(0, block.targetInputLength);
      var int = parseInt(str, 10);
      if (!isNaN(int)) {
        block.intValue = int;
        block.strValue = str;
        value = value.slice(block.targetInputLength); // reduce value by extracted number
      }
    });

    var findPart = function(blocks, parts) {
      if (!Array.isArray(parts)) parts = [parts];
      return blocks
        .filter(function(block) {
          return parts.indexOf(block.part) >= 0;
        })
        .map(function(block) {
          return block.intValue;
        })
        .shift(); // returns undefined if not found
    };

    /// return an array (sorted) featuring block part and the date value [{part:, value:}]
    var datePartsBlockOrder = function(blocks, fixedDate, fullYearDone) {
      return blocks.map(function(block) {
        var zpadLength = block.strValue ? block.strValue.length : 0; // re-pad to the length the user provided
        switch (block.part) {
          case "Y":
          case "y":
            //return fixedDate.year;
            return owner.zpad(fixedDate.year, zpadLength);
            break;
          case "M":
            //return fixedDate.month;
            return owner.zpad(fixedDate.month, zpadLength);
            break;
          case "d":
            //return fixedDate.day;
            return owner.zpad(fixedDate.day, zpadLength);
            break;
          case "h":
            //return fixedDate.hour;
            return owner.zpad(fixedDate.hour, zpadLength);
            break;
          case "m":
            //return fixedDate.minute;
            return owner.zpad(fixedDate.minute, zpadLength);
            break;
          case "s":
            //return fixedDate.second;
            return owner.zpad(fixedDate.second, zpadLength);
            break;
        }
      });
    };

    date = {
      year: findPart(blocks, ["y", "Y"]),
      month: findPart(blocks, "M"),
      day: findPart(blocks, "d"),
      hour: findPart(blocks, "h"),
      minute: findPart(blocks, "m"),
      second: findPart(blocks, "s")
    };
    // find year block and see if the value matches expected length
    fullYearDone = blocks
      .filter(function(block) {
        return ["Y", "y"].indexOf(block.part) >= 0;
      })
      .map(function(block) {
        return block.intValue
          ? block.intValue.toString().length == block.length
          : false;
      })
      .shift(); // returns undefined if not found;
    fullYearDone = fullYearDone ? fullYearDone : false;

    fixedDate = this.getFixedDate(
      date.year,
      date.month,
      date.day,
      date.hour,
      date.minute,
      date.second
    );

    fixedDate = owner.getRangeFixedDate(fixedDate);
    owner.datetime = fixedDate;
    /*var self = this;*/
    // issue here. We fix the fixed, bounded date, but then return back to our blocks to build the string
    var result =
      fixedDate.length === 0
        ? value
        : datePartsBlockOrder(blocks, fixedDate, fullYearDone).reduce(function(
            previous,
            datePartValue
          ) {
            return previous + (datePartValue != null ? datePartValue : "");
          },
          "");
    /*: blocks.reduce(function(previous, block) {
            return previous + (block.value != null)
              ? self.zpad(block.value, block.inputLength)
              : "";
          }, "");*/
    return result;
  },
  /***
   * Returns the number as a string with a guaranteed minimum length of targetLength. Zeros are used to left-pad the number to reach that length.
   * values of null or empty are returned as an empty string
   */
  zpad: function(number, targetLength) {
    if (typeof number == "undefined" || number === null || number === "") {
      return "";
    }
    var str = number.toString();
    if (str.length < targetLength) {
      // String.prototype.repeat is not avialable in phantomJS.
      //str = "0".repeat(Math.max(targetLength - str.length, 0)) + str;
      // based on MDN polyfill for String.prototype.repeat
      var count = Math.floor(Math.log(targetLength - str.length) / Math.log(2));
      var zstr = "0";
      while (count) {
        zstr += zstr;
        count--;
      }

      str =
        zstr + zstr.substring(0, targetLength - str.length - zstr.length) + str;
    }
    return str;
  },

  /***
   * returns a date object (with time component intact) that is bound by the provided dateMin and dateMax properties.
   * Dates outside this range will return either min or max (+ time parts)
   */
  getRangeFixedDate: function(date) {
    /* min max date part indexes
	0: day
	1: month
	2: year
	*/
    var owner = this,
      dateTimePattern = owner.dateTimePattern,
      dateMin = owner.dateMin || [],
      dateMax = owner.dateMax || [];

    if (!date || (isNaN(date.year) && isNaN(date.month) && isNaN(date.day)))
      return date;
    if (dateMin.length < 3 && dateMax.length < 3) return date;

    if (
      dateTimePattern.filter(function(x) {
        return ["Y", "y"].indexOf(x.toLowerCase()) >= 0;
      }).length > 0 &&
      date.year === 0
    )
      return date;

    var dateArrayToObj = function(dateArray) {
      return {
        year: dateArray[2],
        month: dateArray[1],
        day: dateArray[0],
        hour: date.hour,
        minute: date.minute,
        second: date.second,
        length: dateArray.length
      };
    };
    dateMax = dateArrayToObj(dateMax);
    dateMin = dateArrayToObj(dateMin);

    if (
      dateMax.length &&
      (dateMax.year < date.year ||
        (dateMax.year === date.year &&
          (dateMax.month < date.month ||
            (dateMax.month === date.month && dateMax.day < date.day))))
    )
      return dateMax;

    if (
      dateMin.length &&
      (dateMin.year > date.year ||
        (dateMin.year === date.year &&
          (dateMin.month > date.month ||
            (dateMin.month === date.month && dateMin.day > date.day))))
    )
      return dateMin;
    date.length = 6;
    return date;
  },
  /***
   * Returns an object with valid date part constraints (12 months, <=31 days, no more than 59 minutes and seconds).
   */
  getFixedDate: function(year, month, day, hour, minute, second) {
    year = parseInt(year, 10);
    year = isNaN(year) ? null : year;

    month = month ? Math.min(month, 12) : null;
    day = day ? Math.min(day, 31) : null;
    hour = hour || hour === 0 ? Math.min(hour, 24) : null;
    minute = minute || minute === 0 ? Math.min(minute, 59) : null;
    second = second || second === 0 ? Math.min(second, 59) : null;

    if (month && day) {
      if ([1, 3, 5, 7, 8, 10, 12].indexOf(month) >= 0) {
        day = Math.min(day, 31);
      } else if ([4, 6, 9, 11].indexOf(month) >= 0) {
        day = Math.min(day, 30);
      } else if (month == 2) {
        day = Math.min(day, this.isLeapYear(year) ? 29 : 28);
      }
    }
    /*if ((month < 7 && month % 2 === 0) || (month > 8 && month % 2 === 1)) {
      day = Math.min(day, month === 2 ? (this.isLeapYear(year) ? 29 : 28) : 30);
    }*/

    return {
      year: year,
      month: month,
      day: day,
      hour: hour,
      minute: minute,
      second: second
    };
  },

  isLeapYear: function(year) {
    return (
      (!isNaN(year) && (year % 4 === 0 && year % 100 !== 0)) || year % 400 === 0
    );
  },

  addLeadingZero: function(number) {
    return (number < 10 ? "0" : "") + number;
  },

  addLeadingZeroForYear: function(number, fullYearMode) {
    if (fullYearMode) {
      return (
        (number < 10 ? "000" : number < 100 ? "00" : number < 1000 ? "0" : "") +
        number
      );
    }

    return (number < 10 ? "0" : "") + number;
  }
};

var DateTimeFormatter_1 = DateTimeFormatter;

var TimeFormatter = function (timePattern, timeFormat) {
    var owner = this;

    owner.time = [];
    owner.blocks = [];
    owner.timePattern = timePattern;
    owner.timeFormat = timeFormat;
    owner.initBlocks();
};

TimeFormatter.prototype = {
    initBlocks: function () {
        var owner = this;
        owner.timePattern.forEach(function () {
            owner.blocks.push(2);
        });
    },

    getISOFormatTime: function () {
        var owner = this,
            time = owner.time;

        return time[2] ? (
            owner.addLeadingZero(time[0]) + ':' + owner.addLeadingZero(time[1]) + ':' + owner.addLeadingZero(time[2])
        ) : '';
    },

    getBlocks: function () {
        return this.blocks;
    },

    getTimeFormatOptions: function () {
        var owner = this;
        if (String(owner.timeFormat) === '12') {
            return {
                maxHourFirstDigit: 1,
                maxHours: 12,
                maxMinutesFirstDigit: 5,
                maxMinutes: 60
            };
        }

        return {
            maxHourFirstDigit: 2,
            maxHours: 23,
            maxMinutesFirstDigit: 5,
            maxMinutes: 60
        };
    },

    getValidatedTime: function (value) {
        var owner = this, result = '';

        value = value.replace(/[^\d]/g, '');

        var timeFormatOptions = owner.getTimeFormatOptions();

        owner.blocks.forEach(function (length, index) {
            if (value.length > 0) {
                var sub = value.slice(0, length),
                    sub0 = sub.slice(0, 1),
                    rest = value.slice(length);

                switch (owner.timePattern[index]) {

                case 'h':
                    if (parseInt(sub0, 10) > timeFormatOptions.maxHourFirstDigit) {
                        sub = '0' + sub0;
                    } else if (parseInt(sub, 10) > timeFormatOptions.maxHours) {
                        sub = timeFormatOptions.maxHours + '';
                    }

                    break;

                case 'm':
                case 's':
                    if (parseInt(sub0, 10) > timeFormatOptions.maxMinutesFirstDigit) {
                        sub = '0' + sub0;
                    } else if (parseInt(sub, 10) > timeFormatOptions.maxMinutes) {
                        sub = timeFormatOptions.maxMinutes + '';
                    }
                    break;
                }

                result += sub;

                // update remaining string
                value = rest;
            }
        });

        return this.getFixedTimeString(result);
    },

    getFixedTimeString: function (value) {
        var owner = this, timePattern = owner.timePattern, time = [],
            secondIndex = 0, minuteIndex = 0, hourIndex = 0,
            secondStartIndex = 0, minuteStartIndex = 0, hourStartIndex = 0,
            second, minute, hour;

        if (value.length === 6) {
            timePattern.forEach(function (type, index) {
                switch (type) {
                case 's':
                    secondIndex = index * 2;
                    break;
                case 'm':
                    minuteIndex = index * 2;
                    break;
                case 'h':
                    hourIndex = index * 2;
                    break;
                }
            });

            hourStartIndex = hourIndex;
            minuteStartIndex = minuteIndex;
            secondStartIndex = secondIndex;

            second = parseInt(value.slice(secondStartIndex, secondStartIndex + 2), 10);
            minute = parseInt(value.slice(minuteStartIndex, minuteStartIndex + 2), 10);
            hour = parseInt(value.slice(hourStartIndex, hourStartIndex + 2), 10);

            time = this.getFixedTime(hour, minute, second);
        }

        if (value.length === 4 && owner.timePattern.indexOf('s') < 0) {
            timePattern.forEach(function (type, index) {
                switch (type) {
                case 'm':
                    minuteIndex = index * 2;
                    break;
                case 'h':
                    hourIndex = index * 2;
                    break;
                }
            });

            hourStartIndex = hourIndex;
            minuteStartIndex = minuteIndex;

            second = 0;
            minute = parseInt(value.slice(minuteStartIndex, minuteStartIndex + 2), 10);
            hour = parseInt(value.slice(hourStartIndex, hourStartIndex + 2), 10);

            time = this.getFixedTime(hour, minute, second);
        }

        owner.time = time;

        return time.length === 0 ? value : timePattern.reduce(function (previous, current) {
            switch (current) {
            case 's':
                return previous + owner.addLeadingZero(time[2]);
            case 'm':
                return previous + owner.addLeadingZero(time[1]);
            case 'h':
                return previous + owner.addLeadingZero(time[0]);
            }
        }, '');
    },

    getFixedTime: function (hour, minute, second) {
        second = Math.min(parseInt(second || 0, 10), 60);
        minute = Math.min(minute, 60);
        hour = Math.min(hour, 60);

        return [hour, minute, second];
    },

    addLeadingZero: function (number) {
        return (number < 10 ? '0' : '') + number;
    }
};

var TimeFormatter_1 = TimeFormatter;

var PhoneFormatter = function (formatter, delimiter) {
    var owner = this;

    owner.delimiter = (delimiter || delimiter === '') ? delimiter : ' ';
    owner.delimiterRE = delimiter ? new RegExp('\\' + delimiter, 'g') : '';

    owner.formatter = formatter;
};

PhoneFormatter.prototype = {
    setFormatter: function (formatter) {
        this.formatter = formatter;
    },

    format: function (phoneNumber) {
        var owner = this;

        owner.formatter.clear();

        // only keep number and +
        phoneNumber = phoneNumber.replace(/[^\d+]/g, '');

        // strip non-leading +
        phoneNumber = phoneNumber.replace(/^\+/, 'B').replace(/\+/g, '').replace('B', '+');

        // strip delimiter
        phoneNumber = phoneNumber.replace(owner.delimiterRE, '');

        var result = '', current, validated = false;

        for (var i = 0, iMax = phoneNumber.length; i < iMax; i++) {
            current = owner.formatter.inputDigit(phoneNumber.charAt(i));

            // has ()- or space inside
            if (/[\s()-]/g.test(current)) {
                result = current;

                validated = true;
            } else {
                if (!validated) {
                    result = current;
                }
                // else: over length input
                // it turns to invalid number again
            }
        }

        // strip ()
        // e.g. US: 7161234567 returns (716) 123-4567
        result = result.replace(/[()]/g, '');
        // replace library delimiter with user customized delimiter
        result = result.replace(/[\s-]/g, owner.delimiter);

        return result;
    }
};

var PhoneFormatter_1 = PhoneFormatter;

var CreditCardDetector = {
    blocks: {
        uatp:          [4, 5, 6],
        amex:          [4, 6, 5],
        diners:        [4, 6, 4],
        discover:      [4, 4, 4, 4],
        mastercard:    [4, 4, 4, 4],
        dankort:       [4, 4, 4, 4],
        instapayment:  [4, 4, 4, 4],
        jcb15:         [4, 6, 5],
        jcb:           [4, 4, 4, 4],
        maestro:       [4, 4, 4, 4],
        visa:          [4, 4, 4, 4],
        mir:           [4, 4, 4, 4],
        unionPay:      [4, 4, 4, 4],
        general:       [4, 4, 4, 4]
    },

    re: {
        // starts with 1; 15 digits, not starts with 1800 (jcb card)
        uatp: /^(?!1800)1\d{0,14}/,

        // starts with 34/37; 15 digits
        amex: /^3[47]\d{0,13}/,

        // starts with 6011/65/644-649; 16 digits
        discover: /^(?:6011|65\d{0,2}|64[4-9]\d?)\d{0,12}/,

        // starts with 300-305/309 or 36/38/39; 14 digits
        diners: /^3(?:0([0-5]|9)|[689]\d?)\d{0,11}/,

        // starts with 51-55/2221–2720; 16 digits
        mastercard: /^(5[1-5]\d{0,2}|22[2-9]\d{0,1}|2[3-7]\d{0,2})\d{0,12}/,

        // starts with 5019/4175/4571; 16 digits
        dankort: /^(5019|4175|4571)\d{0,12}/,

        // starts with 637-639; 16 digits
        instapayment: /^63[7-9]\d{0,13}/,

        // starts with 2131/1800; 15 digits
        jcb15: /^(?:2131|1800)\d{0,11}/,

        // starts with 2131/1800/35; 16 digits
        jcb: /^(?:35\d{0,2})\d{0,12}/,

        // starts with 50/56-58/6304/67; 16 digits
        maestro: /^(?:5[0678]\d{0,2}|6304|67\d{0,2})\d{0,12}/,

        // starts with 22; 16 digits
        mir: /^220[0-4]\d{0,12}/,

        // starts with 4; 16 digits
        visa: /^4\d{0,15}/,

        // starts with 62; 16 digits
        unionPay: /^62\d{0,14}/
    },

    getStrictBlocks: function (block) {
      var total = block.reduce(function (prev, current) {
        return prev + current;
      }, 0);

      return block.concat(19 - total);
    },

    getInfo: function (value, strictMode) {
        var blocks = CreditCardDetector.blocks,
            re = CreditCardDetector.re;

        // Some credit card can have up to 19 digits number.
        // Set strictMode to true will remove the 16 max-length restrain,
        // however, I never found any website validate card number like
        // this, hence probably you don't want to enable this option.
        strictMode = !!strictMode;

        for (var key in re) {
            if (re[key].test(value)) {
                var matchedBlocks = blocks[key];
                return {
                    type: key,
                    blocks: strictMode ? this.getStrictBlocks(matchedBlocks) : matchedBlocks
                };
            }
        }

        return {
            type: 'unknown',
            blocks: strictMode ? this.getStrictBlocks(blocks.general) : blocks.general
        };
    }
};

var CreditCardDetector_1 = CreditCardDetector;

var Util = {
    noop: function () {
    },

    strip: function (value, re) {
        return value.replace(re, '');
    },

    getPostDelimiter: function (value, delimiter, delimiters) {
        // single delimiter
        if (delimiters.length === 0) {
            return value.slice(-delimiter.length) === delimiter ? delimiter : '';
        }

        // multiple delimiters
        var matchedDelimiter = '';
        delimiters.forEach(function (current) {
            if (value.slice(-current.length) === current) {
                matchedDelimiter = current;
            }
        });

        return matchedDelimiter;
    },

    getDelimiterREByDelimiter: function (delimiter) {
        return new RegExp(delimiter.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1'), 'g');
    },

    getNextCursorPosition: function (prevPos, oldValue, newValue, delimiter, delimiters) {
      // If cursor was at the end of value, just place it back.
      // Because new value could contain additional chars.
      if (oldValue.length === prevPos) {
          return newValue.length;
      }

      return prevPos + this.getPositionOffset(prevPos, oldValue, newValue, delimiter ,delimiters);
    },

    getPositionOffset: function (prevPos, oldValue, newValue, delimiter, delimiters) {
        var oldRawValue, newRawValue, lengthOffset;

        oldRawValue = this.stripDelimiters(oldValue.slice(0, prevPos), delimiter, delimiters);
        newRawValue = this.stripDelimiters(newValue.slice(0, prevPos), delimiter, delimiters);
        lengthOffset = oldRawValue.length - newRawValue.length;

        return (lengthOffset !== 0) ? (lengthOffset / Math.abs(lengthOffset)) : 0;
    },

    stripDelimiters: function (value, delimiter, delimiters) {
        var owner = this;

        // single delimiter
        if (delimiters.length === 0) {
            var delimiterRE = delimiter ? owner.getDelimiterREByDelimiter(delimiter) : '';

            return value.replace(delimiterRE, '');
        }

        // multiple delimiters
        delimiters.forEach(function (current) {
            current.split('').forEach(function (letter) {
                value = value.replace(owner.getDelimiterREByDelimiter(letter), '');
            });
        });

        return value;
    },

    headStr: function (str, length) {
        return str.slice(0, length);
    },

    getMaxLength: function (blocks) {
        return blocks.reduce(function (previous, current) {
            return previous + current;
        }, 0);
    },

    // strip prefix
    // Before type  |   After type    |     Return value
    // PEFIX-...    |   PEFIX-...     |     ''
    // PREFIX-123   |   PEFIX-123     |     123
    // PREFIX-123   |   PREFIX-23     |     23
    // PREFIX-123   |   PREFIX-1234   |     1234
    getPrefixStrippedValue: function (value, prefix, prefixLength, prevResult, delimiter, delimiters, noImmediatePrefix) {
        // No prefix
        if (prefixLength === 0) {
          return value;
        }

        // Pre result prefix string does not match pre-defined prefix
        if (prevResult.slice(0, prefixLength) !== prefix) {
          // Check if the first time user entered something
          if (noImmediatePrefix && !prevResult && value) return value;

          return '';
        }

        var prevValue = this.stripDelimiters(prevResult, delimiter, delimiters);

        // New value has issue, someone typed in between prefix letters
        // Revert to pre value
        if (value.slice(0, prefixLength) !== prefix) {
          return prevValue.slice(prefixLength);
        }

        // No issue, strip prefix for new value
        return value.slice(prefixLength);
    },

    getFirstDiffIndex: function (prev, current) {
        var index = 0;

        while (prev.charAt(index) === current.charAt(index)) {
            if (prev.charAt(index++) === '') {
                return -1;
            }
        }

        return index;
    },

    getFormattedValue: function (value, blocks, blocksLength, delimiter, delimiters, delimiterLazyShow) {
        var result = '',
            multipleDelimiters = delimiters.length > 0,
            currentDelimiter;

        // no options, normal input
        if (blocksLength === 0) {
            return value;
        }

        blocks.forEach(function (length, index) {
            if (value.length > 0) {
                var sub = value.slice(0, length),
                    rest = value.slice(length);

                if (multipleDelimiters) {
                    currentDelimiter = delimiters[delimiterLazyShow ? (index - 1) : index] || currentDelimiter;
                } else {
                    currentDelimiter = delimiter;
                }

                if (delimiterLazyShow) {
                    if (index > 0) {
                        result += currentDelimiter;
                    }

                    result += sub;
                } else {
                    result += sub;

                    if (sub.length === length && index < blocksLength - 1) {
                        result += currentDelimiter;
                    }
                }

                // update remaining string
                value = rest;
            }
        });

        return result;
    },

    // move cursor to the end
    // the first time user focuses on an input with prefix
    fixPrefixCursor: function (el, prefix, delimiter, delimiters) {
        if (!el) {
            return;
        }

        var val = el.value,
            appendix = delimiter || (delimiters[0] || ' ');

        if (!el.setSelectionRange || !prefix || (prefix.length + appendix.length) < val.length) {
            return;
        }

        var len = val.length * 2;

        // set timeout to avoid blink
        setTimeout(function () {
            el.setSelectionRange(len, len);
        }, 1);
    },

    // Check if input field is fully selected
    checkFullSelection: function(value) {
      try {
        var selection = window.getSelection() || document.getSelection() || {};
        return selection.toString().length === value.length;
      } catch (ex) {
        // Ignore
      }

      return false;
    },

    setSelection: function (element, position, doc) {
        if (element !== this.getActiveElement(doc)) {
            return;
        }

        // cursor is already in the end
        if (element && element.value.length <= position) {
          return;
        }

        if (element.createTextRange) {
            var range = element.createTextRange();

            range.move('character', position);
            range.select();
        } else {
            try {
                element.setSelectionRange(position, position);
            } catch (e) {
                // eslint-disable-next-line
                console.warn('The input element type does not support selection');
            }
        }
    },

    getActiveElement: function(parent) {
        var activeElement = parent.activeElement;
        if (activeElement && activeElement.shadowRoot) {
            return this.getActiveElement(activeElement.shadowRoot);
        }
        return activeElement;
    },

    isAndroid: function () {
        return navigator && /android/i.test(navigator.userAgent);
    },

    // On Android chrome, the keyup and keydown events
    // always return key code 229 as a composition that
    // buffers the user’s keystrokes
    // see https://github.com/nosir/cleave.js/issues/147
    isAndroidBackspaceKeydown: function (lastInputValue, currentInputValue) {
        if (!this.isAndroid() || !lastInputValue || !currentInputValue) {
            return false;
        }

        return currentInputValue === lastInputValue.slice(0, -1);
    }
};

var Util_1 = Util;

/**
 * Props Assignment
 *
 * Separate this, so react module can share the usage
 */
var DefaultProperties = {
  // Maybe change to object-assign
  // for now just keep it as simple
  assign: function(target, opts) {
    target = target || {};
    opts = opts || {};

    // credit card
    target.creditCard = !!opts.creditCard;
    target.creditCardStrictMode = !!opts.creditCardStrictMode;
    target.creditCardType = "";
    target.onCreditCardTypeChanged =
      opts.onCreditCardTypeChanged || function() {};

    // phone
    target.phone = !!opts.phone;
    target.phoneRegionCode = opts.phoneRegionCode || "AU";
    target.phoneFormatter = {};

    // time
    target.time = !!opts.time;
    target.timePattern = opts.timePattern || ["h", "m", "s"];
    target.timeFormat = opts.timeFormat || "24";
    target.timeFormatter = {};

    // date
    target.date = !!opts.date;
    target.datePattern = opts.datePattern || ["d", "m", "Y"];
    target.dateMin = opts.dateMin || "";
    target.dateMax = opts.dateMax || "";
    target.dateFormatter = {};

    // date time
    target.dateTime = !!opts.dateTime;
    target.dateTimePattern = opts.dateTimePattern || [
      "d",
      "M",
      "Y",
      "h",
      "m",
      "s"
    ];
    target.dateMin = opts.dateMin || "";
    target.dateMax = opts.dateMax || "";
    target.dateTimeFormatter = {};

    // numeral
    target.numeral = !!opts.numeral;
    target.numeralIntegerScale =
      opts.numeralIntegerScale > 0 ? opts.numeralIntegerScale : 0;
    target.numeralDecimalScale =
      opts.numeralDecimalScale >= 0 ? opts.numeralDecimalScale : 2;
    target.numeralDecimalMark = opts.numeralDecimalMark || ".";
    target.numeralThousandsGroupStyle =
      opts.numeralThousandsGroupStyle || "thousand";
    target.numeralPositiveOnly = !!opts.numeralPositiveOnly;
    target.stripLeadingZeroes = opts.stripLeadingZeroes !== false;
    target.signBeforePrefix = !!opts.signBeforePrefix;

    // others
    target.numericOnly = target.creditCard || target.date || !!opts.numericOnly;

    target.uppercase = !!opts.uppercase;
    target.lowercase = !!opts.lowercase;

    target.prefix = target.creditCard || target.date ? "" : opts.prefix || "";
    target.noImmediatePrefix = !!opts.noImmediatePrefix;
    target.prefixLength = target.prefix.length;
    target.rawValueTrimPrefix = !!opts.rawValueTrimPrefix;
    target.copyDelimiter = !!opts.copyDelimiter;

    target.initValue =
      opts.initValue !== undefined && opts.initValue !== null
        ? opts.initValue.toString()
        : "";

    target.delimiter =
      opts.delimiter || opts.delimiter === ""
        ? opts.delimiter
        : opts.date
        ? "/"
        : opts.time
        ? ":"
        : opts.numeral
        ? ","
        : opts.phone
        ? " "
        : " ";
    target.delimiterLength = target.delimiter.length;
    target.delimiterLazyShow = !!opts.delimiterLazyShow;
    target.delimiters = opts.delimiters
      ? opts.delimiters
      : opts.dateTime
      ? ["/", "/", " ", ":", ":"]
      : [];

    target.blocks = opts.blocks || [];
    target.blocksLength = target.blocks.length;

    target.root = typeof commonjsGlobal === "object" && commonjsGlobal ? commonjsGlobal : window;
    target.document = opts.document || target.root.document;

    target.maxLength = 0;

    target.backspace = false;
    target.result = "";

    target.onValueChanged = opts.onValueChanged || function() {};

    return target;
  }
};

var DefaultProperties_1 = DefaultProperties;

/**
 * Construct a new Cleave instance by passing the configuration object
 *
 * @param {String | HTMLElement} element
 * @param {Object} opts
 */
var Cleave = function(element, opts) {
  var owner = this;
  var hasMultipleElements = false;

  if (typeof element === "string") {
    owner.element = document.querySelector(element);
    hasMultipleElements = document.querySelectorAll(element).length > 1;
  } else {
    if (typeof element.length !== "undefined" && element.length > 0) {
      owner.element = element[0];
      hasMultipleElements = element.length > 1;
    } else {
      owner.element = element;
    }
  }

  if (!owner.element) {
    throw new Error("[cleave.js] Please check the element");
  }

  if (hasMultipleElements) {
    try {
      // eslint-disable-next-line
      console.warn(
        "[cleave.js] Multiple input fields matched, cleave.js will only take the first one."
      );
    } catch (e) {
      // Old IE
    }
  }

  opts.initValue = owner.element.value;

  owner.properties = Cleave.DefaultProperties.assign({}, opts);

  owner.init();
};

Cleave.prototype = {
  init: function() {
    var owner = this,
      pps = owner.properties;

    // no need to use this lib
    if (
      !pps.numeral &&
      !pps.phone &&
      !pps.creditCard &&
      !pps.time &&
      !pps.date &&
      !pps.dateTime &&
      (pps.blocksLength === 0 && !pps.prefix)
    ) {
      owner.onInput(pps.initValue);

      return;
    }

    pps.maxLength = Cleave.Util.getMaxLength(pps.blocks);

    owner.isAndroid = Cleave.Util.isAndroid();
    owner.lastInputValue = "";

    owner.onChangeListener = owner.onChange.bind(owner);
    owner.onKeyDownListener = owner.onKeyDown.bind(owner);
    owner.onFocusListener = owner.onFocus.bind(owner);
    owner.onCutListener = owner.onCut.bind(owner);
    owner.onCopyListener = owner.onCopy.bind(owner);

    owner.element.addEventListener("input", owner.onChangeListener);
    owner.element.addEventListener("keydown", owner.onKeyDownListener);
    owner.element.addEventListener("focus", owner.onFocusListener);
    owner.element.addEventListener("cut", owner.onCutListener);
    owner.element.addEventListener("copy", owner.onCopyListener);

    owner.initPhoneFormatter();
    owner.initDateFormatter();
    owner.initTimeFormatter();
    owner.initDateTimeFormatter();
    owner.initNumeralFormatter();

    // avoid touch input field if value is null
    // otherwise Firefox will add red box-shadow for <input required />
    if (pps.initValue || (pps.prefix && !pps.noImmediatePrefix)) {
      owner.onInput(pps.initValue);
    }
  },

  initNumeralFormatter: function() {
    var owner = this,
      pps = owner.properties;

    if (!pps.numeral) {
      return;
    }

    pps.numeralFormatter = new Cleave.NumeralFormatter(
      pps.numeralDecimalMark,
      pps.numeralIntegerScale,
      pps.numeralDecimalScale,
      pps.numeralThousandsGroupStyle,
      pps.numeralPositiveOnly,
      pps.stripLeadingZeroes,
      pps.prefix,
      pps.signBeforePrefix,
      pps.delimiter
    );
  },

  initTimeFormatter: function() {
    var owner = this,
      pps = owner.properties;

    if (!pps.time) {
      return;
    }

    pps.timeFormatter = new Cleave.TimeFormatter(
      pps.timePattern,
      pps.timeFormat
    );
    pps.blocks = pps.timeFormatter.getBlocks();
    pps.blocksLength = pps.blocks.length;
    pps.maxLength = Cleave.Util.getMaxLength(pps.blocks);
  },

  initDateFormatter: function() {
    var owner = this,
      pps = owner.properties;

    if (!pps.date) {
      return;
    }

    pps.dateFormatter = new Cleave.DateFormatter(
      pps.datePattern,
      pps.dateMin,
      pps.dateMax
    );
    pps.blocks = pps.dateFormatter.getBlocks();
    pps.blocksLength = pps.blocks.length;
    pps.maxLength = Cleave.Util.getMaxLength(pps.blocks);
  },

  initDateTimeFormatter: function() {
    var owner = this,
      pps = owner.properties;

    if (!pps.dateTime) {
      return;
    }

    pps.dateTimeFormatter = new Cleave.DateTimeFormatter(
      pps.dateTimePattern,
      pps.dateMin,
      pps.dateMax,
      pps.timeFormat
    );
    pps.blocks = pps.dateTimeFormatter.getBlocks();
    pps.blocksLength = pps.blocks.length;
    pps.maxLength = Cleave.Util.getMaxLength(pps.blocks);
  },

  initPhoneFormatter: function() {
    var owner = this,
      pps = owner.properties;

    if (!pps.phone) {
      return;
    }

    // Cleave.AsYouTypeFormatter should be provided by
    // external google closure lib
    try {
      pps.phoneFormatter = new Cleave.PhoneFormatter(
        new pps.root.Cleave.AsYouTypeFormatter(pps.phoneRegionCode),
        pps.delimiter
      );
    } catch (ex) {
      throw new Error(
        "[cleave.js] Please include phone-type-formatter.{country}.js lib"
      );
    }
  },

  onKeyDown: function(event) {
    var owner = this,
      pps = owner.properties,
      charCode = event.which || event.keyCode,
      Util = Cleave.Util,
      currentValue = owner.element.value;

    // if we got any charCode === 8, this means, that this device correctly
    // sends backspace keys in event, so we do not need to apply any hacks
    owner.hasBackspaceSupport = owner.hasBackspaceSupport || charCode === 8;
    if (
      !owner.hasBackspaceSupport &&
      Util.isAndroidBackspaceKeydown(owner.lastInputValue, currentValue)
    ) {
      charCode = 8;
    }

    owner.lastInputValue = currentValue;

    // hit backspace when last character is delimiter
    var postDelimiter = Util.getPostDelimiter(
      currentValue,
      pps.delimiter,
      pps.delimiters
    );
    if (charCode === 8 && postDelimiter) {
      pps.postDelimiterBackspace = postDelimiter;
    } else {
      pps.postDelimiterBackspace = false;
    }
  },

  onChange: function() {
    this.onInput(this.element.value);
  },

  onFocus: function() {
    var owner = this,
      pps = owner.properties;

    Cleave.Util.fixPrefixCursor(
      owner.element,
      pps.prefix,
      pps.delimiter,
      pps.delimiters
    );
  },

  onCut: function(e) {
    if (!Cleave.Util.checkFullSelection(this.element.value)) return;
    this.copyClipboardData(e);
    this.onInput("");
  },

  onCopy: function(e) {
    if (!Cleave.Util.checkFullSelection(this.element.value)) return;
    this.copyClipboardData(e);
  },

  copyClipboardData: function(e) {
    var owner = this,
      pps = owner.properties,
      Util = Cleave.Util,
      inputValue = owner.element.value,
      textToCopy = "";

    if (!pps.copyDelimiter) {
      textToCopy = Util.stripDelimiters(
        inputValue,
        pps.delimiter,
        pps.delimiters
      );
    } else {
      textToCopy = inputValue;
    }

    try {
      if (e.clipboardData) {
        e.clipboardData.setData("Text", textToCopy);
      } else {
        window.clipboardData.setData("Text", textToCopy);
      }

      e.preventDefault();
    } catch (ex) {
      //  empty
    }
  },

  onInput: function(value) {
    var owner = this,
      pps = owner.properties,
      Util = Cleave.Util;

    // case 1: delete one more character "4"
    // 1234*| -> hit backspace -> 123|
    // case 2: last character is not delimiter which is:
    // 12|34* -> hit backspace -> 1|34*
    // note: no need to apply this for numeral mode
    var postDelimiterAfter = Util.getPostDelimiter(
      value,
      pps.delimiter,
      pps.delimiters
    );
    if (!pps.numeral && pps.postDelimiterBackspace && !postDelimiterAfter) {
      value = Util.headStr(
        value,
        value.length - pps.postDelimiterBackspace.length
      );
    }

    // phone formatter
    if (pps.phone) {
      if (pps.prefix && (!pps.noImmediatePrefix || value.length)) {
        pps.result =
          pps.prefix +
          pps.phoneFormatter.format(value).slice(pps.prefix.length);
      } else {
        pps.result = pps.phoneFormatter.format(value);
      }
      owner.updateValueState();

      return;
    }

    // numeral formatter
    if (pps.numeral) {
      // Do not show prefix when noImmediatePrefix is specified
      // This mostly because we need to show user the native input placeholder
      if (pps.prefix && pps.noImmediatePrefix && value.length === 0) {
        pps.result = "";
      } else {
        pps.result = pps.numeralFormatter.format(value);
      }
      owner.updateValueState();

      return;
    }

    // date
    if (pps.date) {
      value = pps.dateFormatter.getValidatedDate(value);
    }

    // time
    if (pps.time) {
      value = pps.timeFormatter.getValidatedTime(value);
    }

    // date
    if (pps.dateTime) {
      value = pps.dateTimeFormatter.getValidatedDateTime(value);
    }

    // strip delimiters
    value = Util.stripDelimiters(value, pps.delimiter, pps.delimiters);

    // strip prefix
    value = Util.getPrefixStrippedValue(
      value,
      pps.prefix,
      pps.prefixLength,
      pps.result,
      pps.delimiter,
      pps.delimiters,
      pps.noImmediatePrefix
    );

    // strip non-numeric characters
    value = pps.numericOnly ? Util.strip(value, /[^\d]/g) : value;

    // convert case
    value = pps.uppercase ? value.toUpperCase() : value;
    value = pps.lowercase ? value.toLowerCase() : value;

    // prevent from showing prefix when no immediate option enabled with empty input value
    if (pps.prefix && (!pps.noImmediatePrefix || value.length)) {
      value = pps.prefix + value;

      // no blocks specified, no need to do formatting
      if (pps.blocksLength === 0) {
        pps.result = value;
        owner.updateValueState();

        return;
      }
    }

    // update credit card props
    if (pps.creditCard) {
      owner.updateCreditCardPropsByValue(value);
    }

    // strip over length characters
    value = Util.headStr(value, pps.maxLength);

    // apply blocks
    pps.result = Util.getFormattedValue(
      value,
      pps.blocks,
      pps.blocksLength,
      pps.delimiter,
      pps.delimiters,
      pps.delimiterLazyShow
    );

    owner.updateValueState();
  },

  updateCreditCardPropsByValue: function(value) {
    var owner = this,
      pps = owner.properties,
      Util = Cleave.Util,
      creditCardInfo;

    // At least one of the first 4 characters has changed
    if (Util.headStr(pps.result, 4) === Util.headStr(value, 4)) {
      return;
    }

    creditCardInfo = Cleave.CreditCardDetector.getInfo(
      value,
      pps.creditCardStrictMode
    );

    pps.blocks = creditCardInfo.blocks;
    pps.blocksLength = pps.blocks.length;
    pps.maxLength = Util.getMaxLength(pps.blocks);

    // credit card type changed
    if (pps.creditCardType !== creditCardInfo.type) {
      pps.creditCardType = creditCardInfo.type;

      pps.onCreditCardTypeChanged.call(owner, pps.creditCardType);
    }
  },

  updateValueState: function() {
    var owner = this,
      Util = Cleave.Util,
      pps = owner.properties;

    if (!owner.element) {
      return;
    }

    var endPos = owner.element.selectionEnd;
    var oldValue = owner.element.value;
    var newValue = pps.result;

    endPos = Util.getNextCursorPosition(
      endPos,
      oldValue,
      newValue,
      pps.delimiter,
      pps.delimiters
    );

    // fix Android browser type="text" input field
    // cursor not jumping issue
    if (owner.isAndroid) {
      window.setTimeout(function() {
        owner.element.value = newValue;
        Util.setSelection(owner.element, endPos, pps.document, false);
        owner.callOnValueChanged();
      }, 1);

      return;
    }

    owner.element.value = newValue;
    Util.setSelection(owner.element, endPos, pps.document, false);
    owner.callOnValueChanged();
  },

  callOnValueChanged: function() {
    var owner = this,
      pps = owner.properties;

    pps.onValueChanged.call(owner, {
      target: {
        value: pps.result,
        rawValue: owner.getRawValue()
      }
    });
  },

  setPhoneRegionCode: function(phoneRegionCode) {
    var owner = this,
      pps = owner.properties;

    pps.phoneRegionCode = phoneRegionCode;
    owner.initPhoneFormatter();
    owner.onChange();
  },

  setRawValue: function(value) {
    var owner = this,
      pps = owner.properties;

    value = value !== undefined && value !== null ? value.toString() : "";

    if (pps.numeral) {
      value = value.replace(".", pps.numeralDecimalMark);
    }

    pps.postDelimiterBackspace = false;

    owner.element.value = value;
    owner.onInput(value);
  },

  getRawValue: function() {
    var owner = this,
      pps = owner.properties,
      Util = Cleave.Util,
      rawValue = owner.element.value;

    if (pps.rawValueTrimPrefix) {
      rawValue = Util.getPrefixStrippedValue(
        rawValue,
        pps.prefix,
        pps.prefixLength,
        pps.result,
        pps.delimiter,
        pps.delimiters
      );
    }

    if (pps.numeral) {
      rawValue = pps.numeralFormatter.getRawValue(rawValue);
    } else {
      rawValue = Util.stripDelimiters(rawValue, pps.delimiter, pps.delimiters);
    }

    return rawValue;
  },

  getISOFormatDate: function() {
    var owner = this,
      pps = owner.properties;

    return pps.date
      ? pps.dateFormatter.getISOFormatDate()
      : pps.dateTime
      ? pps.dateTimeFormatter.getISOFormatDate()
      : "";
  },

  getISOFormatTime: function() {
    var owner = this,
      pps = owner.properties;

    return pps.time
      ? pps.timeFormatter.getISOFormatTime()
      : pps.dateTime
      ? pps.dateTimeFormatter.getISOFormatTime()
      : "";
  },

  getISOFormatDateTime: function() {
    var owner = this,
      pps = owner.properties;

    return pps.dateTime ? pps.dateTimeFormatter.getISOFormatDateTime() : "";
  },

  getFormattedValue: function() {
    return this.element.value;
  },

  destroy: function() {
    var owner = this;

    owner.element.removeEventListener("input", owner.onChangeListener);
    owner.element.removeEventListener("keydown", owner.onKeyDownListener);
    owner.element.removeEventListener("focus", owner.onFocusListener);
    owner.element.removeEventListener("cut", owner.onCutListener);
    owner.element.removeEventListener("copy", owner.onCopyListener);
  },

  toString: function() {
    return "[Cleave Object]";
  }
};

Cleave.NumeralFormatter = NumeralFormatter_1;
Cleave.DateFormatter = DateFormatter_1;
Cleave.DateTimeFormatter = DateTimeFormatter_1;
Cleave.TimeFormatter = TimeFormatter_1;
Cleave.PhoneFormatter = PhoneFormatter_1;
Cleave.CreditCardDetector = CreditCardDetector_1;
Cleave.Util = Util_1;
Cleave.DefaultProperties = DefaultProperties_1;

// for angular directive
(typeof commonjsGlobal === "object" && commonjsGlobal ? commonjsGlobal : window)["Cleave"] = Cleave;

// CommonJS
var Cleave_1 = Cleave;

export default Cleave_1;
