from .common import InputError
from . import (suvat_journey, stages, overtaking, vertical_projection, bouncing_ball, vertical_meeting, parachutist,
               hanging_strings, slope_limiting, rough_surface, inclined_plane, slope_up_back, towing, lift, pulley_hanging, pulley_table,
               pulley_slope, pulley_extra_mass, collision, wall_bounce, soft_ground,
               plank, beam, vectors, vector_acceleration)

# Order here is the order on the index page (by chapter). Only scenes where
# something moves or changes are listed - static set-ups are left out on purpose.
_MODULES = (suvat_journey, stages, overtaking, vertical_projection, bouncing_ball, vertical_meeting, parachutist,
            hanging_strings, slope_limiting, rough_surface, inclined_plane, slope_up_back, towing, lift, pulley_hanging, pulley_table,
            pulley_slope, pulley_extra_mass, collision, wall_bounce, soft_ground,
            plank, beam, vectors, vector_acceleration)
SCENES = {m.SCENE["id"]: {**m.SCENE, "solve": m.solve} for m in _MODULES}
__all__ = ["SCENES", "InputError"]
