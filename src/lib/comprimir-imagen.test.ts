import { describe, expect, it } from "vitest";
import { medidasAchicadas } from "./comprimir-imagen";

describe("achicar fotos antes de subir", () => {
  it("deja el lado más largo en 1.500 px y mantiene la proporción", () => {
    expect(medidasAchicadas(4000, 3000)).toEqual({ ancho: 1500, alto: 1125 });
    expect(medidasAchicadas(3024, 4032)).toEqual({ ancho: 1125, alto: 1500 });
  });

  it("no agranda fotos chicas", () => {
    expect(medidasAchicadas(800, 600)).toEqual({ ancho: 800, alto: 600 });
  });
});
