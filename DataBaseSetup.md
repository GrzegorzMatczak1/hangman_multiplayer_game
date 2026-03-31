Words:
```
CREATE TABLE IF NOT EXISTS public.words
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    word character varying(255) COLLATE pg_catalog."default" NOT NULL,
    size integer NOT NULL,
    CONSTRAINT words_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.words
    OWNER to postgres;
```

User:
```
CREATE TABLE IF NOT EXISTS public."user"
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    username character varying(50) COLLATE pg_catalog."default" NOT NULL,
    password character varying(255) COLLATE pg_catalog."default" NOT NULL,
    lives integer NOT NULL DEFAULT 10,
    guesses character varying(50)[] COLLATE pg_catalog."default",
    timeteaken interval second,
    finished boolean NOT NULL DEFAULT false,
    foundword boolean NOT NULL DEFAULT false,
    CONSTRAINT user_pkey PRIMARY KEY (id),
    CONSTRAINT username_unique UNIQUE (username)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."user"
    OWNER to postgres;
```

Round:
```
CREATE TABLE IF NOT EXISTS public.round
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    host integer NOT NULL,
    chosenword integer NOT NULL,
    wordsize integer NOT NULL,
    active boolean NOT NULL DEFAULT true,
    started boolean NOT NULL DEFAULT false,
    finished boolean NOT NULL DEFAULT false,
    CONSTRAINT round_pkey PRIMARY KEY (id),
    CONSTRAINT chosenwordlink FOREIGN KEY (chosenword)
        REFERENCES public.words (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT hostlink FOREIGN KEY (host)
        REFERENCES public."user" (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.round
    OWNER to postgres;
```

Roundinfo:
```
CREATE TABLE IF NOT EXISTS public.roundinfo
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    roundid integer NOT NULL,
    userid integer NOT NULL,
    livesleft integer,
    timeteaken interval second,
    CONSTRAINT roundinfo_pkey PRIMARY KEY (id),
    CONSTRAINT roundidlink FOREIGN KEY (roundid)
        REFERENCES public.round (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT useridlink FOREIGN KEY (userid)
        REFERENCES public."user" (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.roundinfo
    OWNER to postgres;
```