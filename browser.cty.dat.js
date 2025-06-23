class AD1CCtyImpl {
  constructor() {
    this.entities = new Map(); // Simulating the entity container
    this.prefixes = new Map();
    this.nonPrefixSuffix = /^([0-9AMPQR]|QRP[P]*|F[DF]|[AM]M|L[HT]|LGT)$/;
  }

  // Lookup entity based on a call and prefix
  lookupEntity(call, prefixObj) {
    call = call.toUpperCase();

    // Deal with special rules not handled by cty.dat
    if (call.startsWith('KG4') && call.length !== 5 && call.length !== 3) {
      // KG4 2x1 and 2x3 calls that map to Gitmo are mainland US, not Gitmo
      let kp = this.prefixes.get("K"); // Return the "K" entity (mainland US)
      return this.entities.get(kp.entityId);
    } else {
      // Use the entity_id from the prefix object to find the entity
      return this.entities.get(prefixObj.entityId);
    }
  }

  overrideValue(s, lb, ub) {
    const pos = s.indexOf(lb);
    if (pos !== -1) {
      const start = pos + 1;
      const end = s.indexOf(ub, start);
      if (end !== -1) {
        const v = s.substring(start, end);
        return { success: true, value: v };
      }
    }
    return { success: false, value: null };
  }

  // Method to fix up a record based on prefix and entity
  fixup(prefixObj, entityObj) {
    const result = {
      continent: entityObj.continent,
      CQ_zone: entityObj.CQ_zone,
      ITU_zone: entityObj.ITU_zone,
      entity_name: entityObj.name,
      WAE_only: entityObj.WAE_only,
      latitude: entityObj.lat,
      longitude: entityObj.long,
      UTC_offset: entityObj.UTC_offset,
      primary_prefix: entityObj.primary_prefix,
    };

    let ok1 = true,
      ok2 = true,
      ok3 = true,
      ok4 = true,
      ok5 = true;
    let value = '';

    let res1 = this.overrideValue(prefixObj.prefix, '(', ')');
    if (res1.success) {
      result.CQ_zone = parseInt(res1.value, 10);
      if (isNaN(result.CQ_zone)) ok1 = false;
    }

    let res2 = this.overrideValue(prefixObj.prefix, '[', ']');
    if (res2.success) {
      result.ITU_zone = parseInt(value, 10);
      if (isNaN(result.ITU_zone)) ok2 = false;
    }

    let res3 = this.overrideValue(prefixObj.prefix, '<', '>');
    if (res3.success) {
      const fix = value.split('/');
      result.latitude = parseFloat(fix[0]);
      if (isNaN(result.latitude)) ok3 = false;
      result.longitude = parseFloat(fix[1]);
      if (isNaN(result.longitude)) ok4 = false;
    }

    let res6 = this.overrideValue(prefixObj.prefix, '{', '}');
    if (res6.success) result.continent = this.continent(res6.value);

    let res5 = this.overrideValue(prefixObj.prefix, '~', '~');
    if (res5.success) {
      result.UTC_offset = parseFloat(res5.value) * 3600;
      if (isNaN(result.UTC_offset)) ok5 = false;
    }

    if (!(ok1 && ok2 && ok3 && ok4 && ok5)) {
      throw new Error(`Invalid number in cty.dat for override of ${prefixObj.prefix}`);
    }

    return result;
  }

  // Enum for continents
  Continent = {
    AF: 'AF',
    AN: 'AN',
    AS: 'AS',
    EU: 'EU',
    NA: 'NA',
    OC: 'OC',
    SA: 'SA',
  };

  // Method to map continent_id to a Continent enum
  continent(continentId) {
    let continent;

    switch (continentId) {
      case 'AF':
        continent = this.Continent.AF;
        break;
      case 'AN':
        continent = this.Continent.AN;
        break;
      case 'AS':
        continent = this.Continent.AS;
        break;
      case 'EU':
        continent = this.Continent.EU;
        break;
      case 'NA':
        continent = this.Continent.NA;
        break;
      case 'OC':
        continent = this.Continent.OC;
        break;
      case 'SA':
        continent = this.Continent.SA;
        break;
      default:
        throw new Error(`Invalid continent id: ${continentId}`);
    }

    return continent;
  }

  createLineIterator(url) {
	  const decoder = new TextDecoder();
	  let reader, buffer = '', lines = [];

	  let initialized = fetch(url)
		.then(res => {
		  if (!res.ok) throw new Error(`HTTP ${res.status}`);
		  reader = res.body.getReader();
		});

	  return {
		async next() {
		  await initialized;

		  while (lines.length === 0) {
			const { value, done } = await reader.read();

			if (done) {
			  if (buffer) {
				// last line in buffer
				const finalLine = buffer;
				buffer = '';
				return { value: finalLine, done: false };
			  }
			  return { value: undefined, done: true };
			}

			buffer += decoder.decode(value, { stream: true });

			const split = buffer.split(/\r?\n/);
			buffer = split.pop(); // save partial line
			lines = split;
		  }

		  return { value: lines.shift(), done: false };
		}
	  };
	}

  // Load data from file
  async loadCty(fileUri) {
    let entityId = 0;
    let lineNumber = 0;

    this.entities.clear();
    this.prefixes.clear();

    const lineIter = this.createLineIterator(fileUri);

    let entityLine;
    while (!(entityLine = await lineIter.next()).done) {
  
      lineNumber++;
      const entityParts = entityLine.value.split(':');

      if (entityParts.length >= 8) {
        let primaryPrefix = entityParts[7].trim();
        let WAE_only = false;

        if (primaryPrefix.startsWith('*')) {
          primaryPrefix = primaryPrefix.slice(1);
          WAE_only = true;
        }

        let ok1 = true,
          ok2 = true,
          ok3 = true,
          ok4 = true,
          ok5 = true;
        const entity = {
          id: ++entityId,
          name: entityParts[0].trim(),
          WAE_only: WAE_only,
          CQ_zone: parseInt(entityParts[1].trim(), 10),
          ITU_zone: parseInt(entityParts[2].trim(), 10),
          continent: this.continent(entityParts[3].trim()),
          latitude: parseFloat(entityParts[4].trim()),
          longitude: parseFloat(entityParts[5].trim()),
          UTC_offset: parseFloat(entityParts[6].trim()) * 3600,
          primary_prefix: primaryPrefix,
        };

        if (isNaN(entity.CQ_zone)) ok1 = false;
        if (isNaN(entity.ITU_zone)) ok2 = false;
        if (isNaN(entity.latitude)) ok3 = false;
        if (isNaN(entity.longitude)) ok4 = false;
        if (isNaN(entity.UTC_offset)) ok5 = false;

        if (!(ok1 && ok2 && ok3 && ok4 && ok5)) {
          throw new Error(`Invalid number in cty.dat line ${lineNumber}`);
        }

        this.entities.set(entityId, entity);

        let detail = '';
        let line = '';
        do {		
          line = await lineIter.next()			    		
          lineNumber++;
          detail += line.value;
        } while (!line.value.endsWith(';'));

        const prefixList = detail.slice(0, -1).split(',');
        for (let lprefix of prefixList) {
          let prefix = lprefix.trim();
          let exact = false;
          if (prefix.startsWith('=')) {
            prefix = prefix.slice(1);
            exact = true;
          }
          this.prefixes.set(prefix, { prefix, exact, entityId });
        }
      }
    }
  }

  effectivePrefix(callsign) {
    let prefix = callsign;
    const slashPos = callsign.indexOf('/');

    if (slashPos >= 0) {
      const rightSize = callsign.length - slashPos - 1;

      // Native call is longer than prefix/suffix algorithm
      if (rightSize >= slashPos) {
        prefix = callsign.substring(0, slashPos);
      } else {
        prefix = callsign.substring(slashPos + 1);
        // Assuming nonPrefixSuffix is a defined variable
        if (this.nonPrefixSuffix.test(prefix)) {
          prefix = callsign.substring(0, slashPos); // ignore non-prefix suffixes
        }
      }
    }

    return prefix.toUpperCase();
  }

  // Main lookup function
  lookup(call) {
    const exactSearch = call.toUpperCase();

    // Skip processing if the call ends with "/MM" or "/AM"
    if (!(exactSearch.endsWith('/MM') || exactSearch.endsWith('/AM'))) {
      let searchPrefix = this.effectivePrefix(exactSearch);

      if (searchPrefix !== exactSearch) {
        let p = this.prefixes.get(exactSearch);
        if (p && p.exact) {
          return this.fixup(p, this.lookupEntity(call, p));
        }
      }

      // Loop to reduce the search prefix one character at a time
      while (searchPrefix.length) {
        let p = this.prefixes.get(searchPrefix);
        if (p) {
          let e = this.lookupEntity(call, p);
          // Always lookup WAE entities; we substitute them later based on user options
          if (!p.exact || call.length === searchPrefix.length) {
            let tempp = p;
            tempp.prefix = searchPrefix;
            return this.fixup(tempp, e);
          }
        }
        searchPrefix = searchPrefix.slice(0, -1); // Reduce the prefix size by one
      }
    }

    // Return an empty record if no match is found
    return null;
  }
}
