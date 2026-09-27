    const PEOPLE = {
      mariana: { name: 'Mariana Restrepo Villegas', ini: 'MR', ch: 'wa', time: '9:28 a. m.', prev: 'Hola, ¿me pueden pasar con una persona? Es por el reembolso del viaje a Cartagena', unread: 3, kind: 'queued', wait: '14 min', prio: 'urgent' },
      julian: { name: 'Julián Ortiz', ini: 'JO', ch: 'ig', time: '9:36 a. m.', prev: 'Foto', media: 'photo', unread: 1, kind: 'queued', wait: '6 min' },
      hotel: { name: 'Hotel Boutique Casa del Mar · Reservas corporativas', ini: 'HC', ch: 'wa', time: '9:40 a. m.', prev: '¿Tienen disponibilidad para 40 personas del 12 al 15 de octubre? Necesitamos cotización con traslados', unread: 124, kind: 'queued', wait: '2 min', prio: 'high' },
      laura: { name: 'Laura Gómez', ini: 'LG', ch: 'wa', time: '9:41 a. m.', prev: 'Perfecto, quedo atenta al link de pago', unread: 0, kind: 'mine' },
      andres: { name: 'Andrés Felipe Cárdenas Montoya', ini: 'AC', ch: 'wa', time: '9:12 a. m.', prev: 'Nota de voz · 0:42', media: 'voice', unread: 1, kind: 'mine' },
      valen: { name: 'Valentina Herrera', ini: 'VH', ch: 'wa', time: '9:39 a. m.', prev: 'Sí, somos dos adultos y un niño de 6 años', unread: 0, kind: 'ai' },
      pedro: { name: 'Pedro Luis Arango', ini: 'PA', ch: 'ig', time: '9:33 a. m.', prev: '¿Cuánto cuesta el tour a Guatapé con almuerzo?', unread: 0, kind: 'ai' },
      ricardo: { name: 'Ricardo Peña', ini: 'RP', ch: 'wa', time: '9:30 a. m.', prev: 'Listo, espero la cotización del grupo', unread: 0, kind: 'other', owner: 'Con Esteban' },
      dani: { name: 'Daniela Mejía', ini: 'DM', ch: 'ms', time: '9:20 a. m.', prev: 'Me interesa el plan de San Andrés en noviembre', unread: 0, kind: 'ai' },
      jp: { name: 'Juan Pablo Mesa', ini: 'JM', ch: 'wa', time: 'Ayer', prev: 'Muchas gracias por todo, nos vemos en el aeropuerto', unread: 0, kind: 'closed', done: 'Resuelta · ayer' }
    };
    const mkRow = (key, mixed, coral) => {
      const p = PEOPLE[key];
      const unread = p.kind === 'closed' ? 0 : p.unread;
      let meta = null;
      if (p.kind === 'queued') meta = { mDot: true, mC: 'var(--warn)', mT: 'En cola · ' + p.wait };
      else if (p.kind === 'closed') meta = { mDone: true, mT: p.done };
      else if (mixed && p.kind === 'ai') meta = { mAi: true, mT: 'Axi atiende' };
      else if (mixed && p.kind === 'mine') meta = { mDot: true, mC: 'var(--fg)', mT: 'Contigo' };
      else if (mixed && p.kind === 'other') meta = { mDot: true, mC: 'var(--mut)', mT: p.owner };
      const prioT = p.prio === 'urgent' ? 'Prioridad urgente' : p.prio === 'high' ? 'Prioridad alta' : '';
      return Object.assign({
        name: p.name, ini: p.ini, time: p.time, prev: p.prev, unread: unread > 99 ? '99+' : String(unread),
        hasUnread: unread > 0, ub: coral ? 'ub-coral' : 'ub-tinta', wa: p.ch === 'wa', ig: p.ch === 'ig', ms: p.ch === 'ms',
        photo: p.media === 'photo', voice: p.media === 'voice',
        prio: p.kind !== 'closed' && !!p.prio, prioC: p.prio === 'urgent' ? 'var(--bad)' : 'var(--warn)', prioT,
        nw: unread > 0 ? 600 : 500, nc: p.kind === 'closed' ? 'var(--mut)' : 'var(--fg)',
        tc: unread > 0 ? 'var(--fg)' : 'var(--mut)', tw: unread > 0 ? 600 : 400,
        pc: unread > 0 ? 'var(--fg)' : 'var(--mut)',
        avStyle: p.kind === 'closed' ? 'opacity:.7' : '',
        hasMeta: meta !== null, mAi: false, mDot: false, mDone: false, mC: '', mT: '',
        aria: [p.name, unread > 0 ? unread + ' sin leer' : '', prioT, meta ? meta.mT : '', p.time].filter(Boolean).join(', ')
      }, meta || {});
    };
